import "server-only";
import type { Confidence, Detection, Issue, Tech } from "@/lib/types";
import { CheckError, domainOf, safeFetch, type FetchedPage } from "./fetch";
import { APP_CATEGORIES, PLATFORMS, TECHNOLOGIES, type Signature } from "./signatures";

interface Context {
  html: string;
  headers: Record<string, string>;
  cookies: string[];
  meta: Record<string, string[]>;
  host: string;
  url: URL;
}

export async function analyzeUrl(target: URL): Promise<Detection> {
  const page = await safeFetch(target);
  const blocked = isBotWall(page);
  if (blocked) {
    throw new CheckError(`blocked ${page.status}`, blocked);
  }
  if (page.status >= 400) {
    throw new CheckError(`http ${page.status}`, `The website responded with an error (HTTP ${page.status}).`);
  }
  const contentType = page.headers["content-type"] ?? "";
  if (contentType && !/html|xml/i.test(contentType)) {
    throw new CheckError(`content-type ${contentType}`, "That address doesn't return a web page.");
  }
  return analyzePage(page);
}

function isBotWall(page: FetchedPage): string | null {
  const challenged =
    page.headers["cf-mitigated"] === "challenge" ||
    ((page.status === 403 || page.status === 503) &&
      /<title>(Just a moment|Attention Required|Access denied)/i.test(page.body));
  return challenged
    ? "This website blocks automated checks (bot protection), so we can't analyse it from here."
    : null;
}

async function analyzePage(page: FetchedPage): Promise<Detection> {
  const url = new URL(page.url);
  const ctx: Context = {
    html: page.body,
    headers: page.headers,
    cookies: page.cookies,
    meta: parseMeta(page.body),
    host: url.hostname.toLowerCase(),
    url,
  };

  // ——— Technologies ———
  const found = new Map<string, Tech>();
  const implied = new Set<string>();
  for (const sig of TECHNOLOGIES) {
    if (matchSignature(sig, ctx).length > 0) {
      found.set(sig.name, { name: sig.name, category: sig.category });
      sig.implies?.forEach((n) => implied.add(n));
    }
  }
  for (const name of implied) {
    const sig = TECHNOLOGIES.find((s) => s.name === name);
    if (sig && !found.has(name)) found.set(name, { name, category: sig.category });
  }

  // ——— Platform ———
  const platformMatches = PLATFORMS.map((sig, order) => ({ sig, order, evidence: matchSignature(sig, ctx) })).filter(
    (m) => m.evidence.length > 0,
  );
  const isWpCom = platformMatches.some((m) => m.sig.name === "WordPress.com");
  if (implied.has("WordPress") && !platformMatches.some((m) => m.sig.name === "WordPress")) {
    const wp = PLATFORMS.findIndex((s) => s.name === "WordPress");
    platformMatches.push({ sig: PLATFORMS[wp], order: wp, evidence: ["WordPress plugin or page builder detected"] });
  }
  const candidates = platformMatches
    .filter((m) => m.sig.name !== "WordPress.com")
    .sort((a, b) => b.evidence.length - a.evidence.length || a.order - b.order);
  if (isWpCom && !candidates.some((c) => c.sig.name === "WordPress")) {
    const wp = PLATFORMS.findIndex((s) => s.name === "WordPress");
    candidates.unshift({ sig: PLATFORMS[wp], order: wp, evidence: ["Hosted on WordPress.com"] });
  }

  let platform: Detection["platform"];
  if (candidates.length > 0) {
    const best = candidates[0];
    platform = {
      name: best.sig.name,
      confidence: best.evidence.length >= 2 ? "high" : "medium",
      evidence: best.evidence,
    };
  } else if (found.has("Shopify Hydrogen")) {
    platform = { name: "Shopify", confidence: "medium", evidence: ["Headless storefront built with Shopify Hydrogen"] };
  } else {
    const framework = ["Next.js", "Nuxt", "Gatsby", "Astro", "SvelteKit", "Remix / React Router", "Angular", "Laravel", "Ruby on Rails", "ASP.NET"].find(
      (f) => found.has(f),
    );
    platform = framework
      ? { name: `Custom-coded (${framework})`, confidence: "medium", evidence: [`${framework} framework detected`] }
      : { name: "Custom-coded", confidence: "low", evidence: ["No known website builder or CMS fingerprint found"] };
  }

  // Keep the platform itself out of the technology list, but show it first.
  const technologies = [...found.values()].filter((t) => t.name !== platform.name);
  technologies.unshift({ name: platform.name, category: "Platform" });

  const appsCount = technologies.filter((t) => (APP_CATEGORIES as string[]).includes(t.category)).length;

  const theme = await detectTheme(platform.name, ctx);
  const likelyPlan = detectPlan(platform.name, ctx, found, appsCount, isWpCom);
  const issues = auditPage(ctx, found, page.truncated);

  return {
    url: page.url,
    domain: domainOf(url),
    pageTitle: extractTitle(ctx.html),
    platform,
    theme,
    likelyPlan,
    technologies,
    appsCount,
    issues,
  };
}

// ————————————————————————————————————————————————————————————— matching

function parseMeta(html: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const head = html.slice(0, 400_000);
  for (const tag of head.match(/<meta\s[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
    }
    const key = (attrs.name ?? attrs.property ?? attrs["http-equiv"] ?? attrs.itemprop)?.toLowerCase();
    if (key && attrs.content !== undefined) (out[key] ??= []).push(decodeEntities(attrs.content));
  }
  return out;
}

function matchSignature(sig: Signature, ctx: Context): string[] {
  const evidence: string[] = [];
  for (const [name, re] of Object.entries(sig.headers ?? {})) {
    const value = ctx.headers[name];
    if (value !== undefined && re.test(value)) evidence.push(`HTTP header "${name}"`);
  }
  for (const [name, re] of Object.entries(sig.meta ?? {})) {
    const hit = ctx.meta[name]?.find((v) => re.test(v));
    if (hit) evidence.push(`<meta ${name}="${hit.slice(0, 60)}">`);
  }
  for (const re of sig.cookies ?? []) {
    const hit = ctx.cookies.find((c) => re.test(c));
    if (hit) evidence.push(`Cookie "${hit.split("=")[0]}"`);
  }
  for (const re of sig.host ?? []) {
    if (re.test(ctx.host)) evidence.push(`Domain ${ctx.host}`);
  }
  for (const re of sig.html ?? []) {
    const m = ctx.html.match(re);
    if (m) evidence.push(`Page source contains "${m[0].slice(0, 60)}"`);
  }
  return evidence;
}

// ————————————————————————————————————————————————————————————— themes

const SHOPIFY_FREE_THEMES = new Set(
  [
    "Dawn", "Refresh", "Sense", "Craft", "Studio", "Taste", "Crave", "Origin", "Colorblock", "Ride",
    "Spotlight", "Publisher", "Trade", "Horizon", "Tinker", "Atelier", "Heritage", "Fabric", "Dwell",
    "Vessel", "Pitch", "Savor", "Debut", "Brooklyn", "Minimal", "Narrative", "Simple", "Supply",
    "Venture", "Boundless", "Express",
  ].map((s) => s.toLowerCase()),
);

async function detectTheme(platform: string, ctx: Context): Promise<Detection["theme"]> {
  try {
    switch (platform) {
      case "Shopify":
        return shopifyTheme(ctx);
      case "WordPress":
        return await wordpressTheme(ctx);
      case "Squarespace": {
        const v = ctx.html.match(/"templateVersion"\s*:\s*"([\d.]+)"/)?.[1];
        return v ? { name: `Squarespace ${v}`, detail: v === "7.1" ? "All 7.1 templates share one engine; the original template name isn't exposed." : undefined } : null;
      }
      case "Drupal": {
        const slug = ctx.html.match(/\/themes\/(?:contrib|custom)\/([\w-]+)\//)?.[1] ?? ctx.html.match(/\/themes\/([\w-]+)\/(?:css|js|dist|build)\//)?.[1];
        return slug ? { name: prettifySlug(slug) } : null;
      }
      case "Joomla": {
        const slug = ctx.html.match(/\/templates\/([\w-]+)\//)?.[1];
        return slug && slug !== "system" ? { name: prettifySlug(slug) } : null;
      }
      case "Magento / Adobe Commerce": {
        const m = ctx.html.match(/\/static\/(?:version\d+\/)?frontend\/([\w-]+)\/([\w-]+)\//);
        return m ? { name: `${m[1]}/${m[2]}`, detail: m[1] === "Magento" ? "Default Magento theme" : undefined } : null;
      }
      case "PrestaShop": {
        const slug = ctx.html.match(/\/themes\/([\w-]+)\/assets\//)?.[1];
        return slug ? { name: prettifySlug(slug) } : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function shopifyTheme(ctx: Context): Detection["theme"] {
  const raw = ctx.html.match(/Shopify\.theme\s*=\s*(\{[^;]*?\})\s*;/)?.[1];
  if (!raw) return null;
  let t: { name?: string; schema_name?: string | null; schema_version?: string | null; theme_store_id?: number | null };
  try {
    t = JSON.parse(raw);
  } catch {
    return null;
  }
  const base = t.schema_name || t.name;
  if (!base) return null;
  const notes: string[] = [];
  if (t.schema_version) notes.push(`v${t.schema_version}`);
  if (t.theme_store_id == null) {
    notes.push("custom or non–Theme Store theme");
  } else {
    notes.push(SHOPIFY_FREE_THEMES.has(base.toLowerCase()) ? "free Shopify theme" : "paid Theme Store theme");
  }
  if (t.name && t.schema_name && t.name.trim().toLowerCase() !== t.schema_name.trim().toLowerCase()) {
    notes.push(`renamed "${t.name.slice(0, 60)}" in the admin — likely customised`);
  }
  return { name: base, detail: notes.join(" · ") };
}

async function wordpressTheme(ctx: Context): Promise<Detection["theme"]> {
  const slugs = [
    ...new Set([...ctx.html.matchAll(/wp-content(?:\\?\/)themes(?:\\?\/)([\w.-]+)(?:\\?\/)/gi)].map((m) => m[1])),
  ].slice(0, 3);
  if (slugs.length === 0) return null;

  const infos = await Promise.all(slugs.map((slug) => readThemeHeader(ctx.url, slug)));
  // A child theme's style.css names its parent in "Template:".
  const child = infos.find((i) => i?.template);
  if (child) {
    const parent = infos.find((i) => i?.slug === child.template);
    return {
      name: parent?.name ?? prettifySlug(child.template!),
      detail: `with child theme "${child.name}"${child.author ? ` by ${child.author}` : ""}`,
    };
  }
  const main = infos.find(Boolean) ?? null;
  if (main) {
    const bits = [main.version && `v${main.version}`, main.author && `by ${main.author}`].filter(Boolean);
    return { name: main.name, detail: bits.join(" · ") || undefined };
  }
  return { name: prettifySlug(slugs[0]) };
}

async function readThemeHeader(pageUrl: URL, slug: string) {
  try {
    const css = await safeFetch(new URL(`/wp-content/themes/${slug}/style.css`, pageUrl), {
      maxBytes: 16_000,
      timeoutMs: 5_000,
      maxRedirects: 2,
    });
    if (css.status >= 400) return null;
    const field = (label: string) =>
      css.body.match(new RegExp(`^[\\s*#@]*${label}\\s*:\\s*(.+)$`, "im"))?.[1].trim().replace(/\*\/.*$/, "").trim() || undefined;
    const name = field("Theme Name");
    if (!name) return null;
    return {
      slug,
      name: stripTags(name).slice(0, 80),
      template: field("Template"),
      version: field("Version"),
      author: field("Author") ? stripTags(field("Author")!).slice(0, 60) : undefined,
    };
  } catch {
    return null;
  }
}

// ————————————————————————————————————————————————————————————— plans

function plan(label: string, confidence: Confidence, reason: string) {
  return { label, confidence, reason };
}

function detectPlan(
  platform: string,
  ctx: Context,
  found: Map<string, Tech>,
  appsCount: number,
  isWpCom: boolean,
): Detection["likelyPlan"] {
  const { html, host } = ctx;
  const locales = new Set(
    [...html.matchAll(/<link[^>]+hreflang=["']([\w-]+)["']/gi)].map((m) => m[1].toLowerCase()).filter((l) => l !== "x-default"),
  ).size;

  switch (platform) {
    case "Shopify": {
      if (ctx.url.pathname === "/password" || /<body[^>]*template-password/i.test(html)) {
        return plan("Store not launched yet", "medium", "The storefront is behind Shopify's password page.");
      }
      if (host.endsWith(".myshopify.com")) {
        return plan("Trial, Starter or Basic", "low", "The store runs on its free .myshopify.com address with no custom domain.");
      }
      // Shopify never exposes the plan, so score public signals that correlate with bigger merchants.
      const signals: string[] = [];
      let score = 0;
      const signal = (points: number, text: string) => {
        score += points;
        signals.push(text);
      };
      if (found.has("Shopify Hydrogen")) signal(2, "a custom headless (Hydrogen) storefront");
      if (locales >= 2) signal(locales >= 10 ? 2 : 1, `${locales} localised markets`);
      if (appsCount >= 6) signal(appsCount >= 12 ? 2 : 1, `${appsCount} apps`);
      if (/Shopify\.theme\s*=\s*\{[^}]*"theme_store_id"\s*:\s*null/.test(html)) signal(1, "a custom-built theme");
      const why = signals.length ? `Based on ${signals.join(", ")}.` : `A lean setup with ${appsCount} detectable app${appsCount === 1 ? "" : "s"}.`;
      if (score >= 3) return plan("Likely Advanced or Plus", "low", why);
      if (score >= 2) return plan("Likely Grow or Advanced", "low", why);
      return plan("Likely Basic or Grow", "low", why);
    }

    case "WordPress": {
      if (isWpCom) {
        if (host.endsWith(".wordpress.com")) return plan("WordPress.com Free", "medium", "Uses a free .wordpress.com address.");
        const plugins = pluginSlugs(html).filter((p) => !["jetpack", "akismet", "gutenberg", "coblocks"].includes(p));
        return plugins.length > 0
          ? plan("WordPress.com Business or Commerce", "medium", "Custom plugins are only available on Business and Commerce plans.")
          : plan("WordPress.com Personal or Premium", "low", "Custom domain but no third-party plugins.");
      }
      const hosts = ["WP Engine", "Kinsta", "WordPress VIP", "Pantheon", "Flywheel", "SiteGround", "Hostinger"];
      const hostName = hosts.find((h) => found.has(h));
      const plugins = pluginSlugs(html).length;
      if (hostName) {
        return plan(`Self-hosted on ${hostName}`, "medium", `Server fingerprints point to ${hostName}${plugins ? `; ${plugins} plugins visible` : ""}.`);
      }
      return plan("Self-hosted WordPress", "low", `The hosting company isn't identifiable from public headers${plugins ? `; ${plugins} plugins visible` : ""}.`);
    }

    case "Wix": {
      // Every Wix page ships CSS mentioning #WIX_ADS; only free sites render the actual banner element.
      if (/\.wixsite\.com$|\.wixstudio\.io$/.test(host) || /<div[^>]+id=["']WIX_ADS["']/.test(html)) {
        return plan("Wix Free", "high", "Free Wix address or Wix ads banner present.");
      }
      if (/wix-stores|wixstores|\/product-page\/|ecom-platform/i.test(html)) {
        return plan("Premium: Core, Business or higher", "medium", "An online store is active, which needs a business-level plan.");
      }
      return plan("Premium plan", "medium", "Custom domain and no Wix ads, so it's on a paid plan.");
    }

    case "Squarespace": {
      if (host.endsWith(".squarespace.com")) return plan("Trial or unpublished", "medium", "Still on a .squarespace.com address.");
      if (/sqs-add-to-cart-button|product-detail|ProductItem-|"isCommerce"\s*:\s*true/i.test(html)) {
        return plan("Business or Commerce plan", "medium", "Selling products requires Business or a Commerce plan.");
      }
      return plan("Personal or higher", "low", "No online store detected.");
    }

    case "Webflow": {
      if (host.endsWith(".webflow.io")) return plan("Free / Starter (staging domain)", "high", "Published only to a .webflow.io address.");
      if (/w-commerce-|data-wf-ecommerce|wf-commerce/i.test(html)) return plan("Ecommerce plan", "high", "Webflow Ecommerce elements are in use.");
      if (/w-dyn-list|w-dyn-item/.test(html)) return plan("CMS plan or higher", "medium", "Pages use Webflow CMS collections.");
      return plan("Basic site plan or higher", "medium", "Custom domain without CMS collections on this page.");
    }

    case "Framer": {
      if (/\.framer\.(website|ai|app|photos|media|wiki)$/.test(host) || /<div[^>]+(?:id|class)=["'][^"']*__framer-badge/.test(html)) {
        return plan("Framer Free", "high", "Free Framer domain or \"Made in Framer\" badge shown.");
      }
      return plan(locales >= 2 ? "Pro or higher" : "Paid plan (Basic or higher)", "medium",
        locales >= 2 ? "Custom domain with multiple locales." : "Custom domain without the Framer badge.");
    }

    case "Ghost":
      return /\.ghost\.io$/.test(host) || /ghost\.io\//i.test(html)
        ? plan("Ghost(Pro) hosted", "medium", "Served from Ghost's own hosting.")
        : plan("Self-hosted Ghost or Ghost(Pro)", "low", "Hosting isn't identifiable.");

    case "HubSpot CMS":
      return host.endsWith(".hs-sites.com")
        ? plan("Free / Starter", "medium", "Uses a free .hs-sites.com address.")
        : plan("Content Hub Starter or higher", "low", "Custom domain on HubSpot CMS.");

    default:
      return null;
  }
}

function pluginSlugs(html: string): string[] {
  return [...new Set([...html.matchAll(/wp-content(?:\\?\/)plugins(?:\\?\/)([\w.-]+)(?:\\?\/)/gi)].map((m) => m[1].toLowerCase()))];
}

// ————————————————————————————————————————————————————————————— audit

function auditPage(ctx: Context, found: Map<string, Tech>, truncated: boolean): Issue[] {
  const { html, meta, url } = ctx;
  const issues: Issue[] = [];
  const add = (id: string, severity: Issue["severity"], title: string, detail: string) =>
    issues.push({ id, severity, title, detail });

  if (url.protocol !== "https:") {
    add("https", "high", "Not served over HTTPS", "Browsers mark the site \"Not secure\", which hurts trust and conversions.");
  }
  if (!meta.viewport?.some((v) => /width\s*=\s*device-width/i.test(v))) {
    add("viewport", "high", "Not set up for mobile screens", "There's no responsive viewport tag, so phones may show a zoomed-out desktop page.");
  }

  const title = extractTitle(html);
  if (!title) {
    add("title", "high", "Missing page title", "The homepage has no <title>, which is what Google shows as the headline in search results.");
  } else if (title.length < 15 || title.length > 65) {
    add("title-length", "low", `Page title is ${title.length < 15 ? "too short" : "too long"} (${title.length} characters)`, "Aim for 30–60 characters so it isn't cut off in search results.");
  }

  const description = meta.description?.[0]?.trim();
  if (!description) {
    add("meta-description", "medium", "No meta description", "Google will pick random page text for your search snippet instead of a persuasive summary.");
  } else if (description.length < 50 || description.length > 170) {
    add("meta-description-length", "low", "Meta description length isn't ideal", `It's ${description.length} characters; 120–160 works best in search results.`);
  }

  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 === 0) add("h1", "medium", "No main heading (H1)", "The page lacks a clear primary headline for visitors and search engines.");
  else if (h1 > 1) add("h1-multiple", "low", `${h1} H1 headings on one page`, "Use a single H1 so the page's main message is unambiguous.");

  const images = (html.match(/<img\b[^>]*>/gi) ?? []).filter((t) => !/aria-hidden=["']true|role=["']presentation|width=["']1["']/i.test(t));
  const noAlt = images.filter((t) => !/\salt\s*=/i.test(t)).length;
  if (images.length > 0 && noAlt / images.length > 0.2) {
    add("alt", "medium", `${noAlt} of ${images.length} images have no alt text`, "Hurts accessibility for screen-reader users and image search visibility.");
  }

  if (!meta["og:image"]?.length) {
    add("og-image", "low", "No social sharing image", "Links shared on WhatsApp, LinkedIn or Facebook show without a preview image.");
  }
  if (!/<link[^>]+rel=["'][^"']*icon/i.test(html)) {
    add("favicon", "low", "No favicon", "Browser tabs and bookmarks show a blank icon, which looks unfinished.");
  }
  if (!/<html[^>]*\slang\s*=/i.test(html)) {
    add("lang", "low", "Page language not declared", "Screen readers and translation tools can't tell which language the page is in.");
  }
  if (!/application\/ld\+json/i.test(html)) {
    add("schema", "low", "No structured data", "Adding schema markup can unlock rich results (stars, prices, FAQs) in Google.");
  }
  if (!/rel=["']canonical["']/i.test(html)) {
    add("canonical", "low", "No canonical URL", "Search engines may index duplicate versions of the page.");
  }

  const scripts = (html.match(/<script\b[^>]*\bsrc\s*=/gi) ?? []).length;
  if (scripts > 30) {
    add("scripts", "medium", `Heavy script load (${scripts} external scripts)`, "Every script slows down the page, especially on mobile. Some are likely unused apps or trackers.");
  }
  if (truncated || html.length > 1_500_000) {
    add("html-size", "medium", "Very large page code", `The homepage HTML is over ${Math.round(html.length / 1000)} KB before images and scripts, which slows first load.`);
  }

  const visibleText = stripTags(html.replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")).replace(/\s+/g, " ").trim();
  if (visibleText.length < 250 && scripts > 3) {
    add("csr", "medium", "Content only appears after JavaScript runs", "Search engines and link previews may see an almost empty page.");
  }

  const hasAnalytics = [...found.values()].some((t) => t.category === "Analytics" || t.category === "Tag manager");
  if (!hasAnalytics) {
    add("analytics", "medium", "No analytics detected", "Without analytics there's no way to measure visitors, conversions or what's working.");
  }

  if (!/href=["'](?:mailto:|tel:)|href=["'][^"']*(?:contact|kontakt|contacto|get-in-touch|book)/i.test(html) && !found.has("WhatsApp chat link")) {
    add("contact", "medium", "No clear contact path on the homepage", "Visitors ready to buy or enquire can't quickly find how to reach you.");
  }

  const hasPixels = [...found.values()].some((t) => t.category === "Advertising");
  const hasConsent = [...found.values()].some((t) => t.category === "Cookie consent");
  if (hasPixels && !hasConsent) {
    add("consent", "low", "Tracking pixels without a cookie banner", "Ad pixels load without a consent tool, a compliance risk for EU/UK visitors.");
  }

  const years = [...html.matchAll(/(?:©|&copy;|&#169;|copyright)\s*(?:\d{4}\s*(?:-|–|&ndash;)\s*)?(20\d{2})/gi)].map((m) => Number(m[1]));
  const currentYear = new Date().getFullYear();
  if (years.length > 0 && Math.max(...years) < currentYear - 1) {
    add("copyright", "low", `Footer still says © ${Math.max(...years)}`, "An outdated year makes the site look unmaintained to visitors.");
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ————————————————————————————————————————————————————————————— helpers

function extractTitle(html: string): string | null {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return t ? decodeEntities(stripTags(t)).replace(/\s+/g, " ").trim().slice(0, 200) || null : null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => codePoint(parseInt(n, 16)));
}

function codePoint(n: number): string {
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
}

function prettifySlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
