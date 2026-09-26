export type Category =
  | "Platform"
  | "Page builder"
  | "Plugin"
  | "Framework"
  | "Analytics"
  | "Advertising"
  | "Tag manager"
  | "Marketing"
  | "Reviews"
  | "Chat & support"
  | "Payments"
  | "Search & merch"
  | "Cookie consent"
  | "Security"
  | "Hosting & CDN"
  | "Web server"
  | "Fonts"
  | "Media"
  | "Scheduling & forms";

export interface Signature {
  name: string;
  category: Category;
  /** Regexes run against the raw HTML. */
  html?: RegExp[];
  /** header name (lowercase) → regex on its value. `/.*​/` means "header present". */
  headers?: Record<string, RegExp>;
  /** meta name/property (lowercase) → regex on content, e.g. { generator: /Webflow/i } */
  meta?: Record<string, RegExp>;
  cookies?: RegExp[];
  /** Regexes run against the final hostname. */
  host?: RegExp[];
  /** Other technologies this one proves (e.g. WooCommerce ⇒ WordPress). */
  implies?: string[];
}

const any = /.*/;

/**
 * Platforms are listed in priority order: when several match (a WordPress site embedding a
 * Shopify buy button, say), the first one in this list is reported as "the" platform.
 */
export const PLATFORMS: Signature[] = [
  {
    name: "Shopify",
    category: "Platform",
    html: [/cdn\.shopify\.com/i, /Shopify\.theme\s*=/, /window\.Shopify\b/, /\.myshopify\.com/i],
    headers: { "x-shopid": any, "x-shopify-stage": any, "powered-by": /shopify/i, "x-shardid": any },
    cookies: [/^_shopify_y=/, /^_shopify_s=/, /^cart_currency=/],
    host: [/\.myshopify\.com$/],
  },
  {
    name: "BigCommerce",
    category: "Platform",
    html: [/cdn\d*\.bigcommerce\.com/i, /stencilBootstrap/, /bigcommerce\.com\/s-/i],
    cookies: [/^SHOP_SESSION_TOKEN=/, /^fornax_anonymousId=/],
  },
  {
    name: "Salesforce Commerce Cloud",
    category: "Platform",
    html: [/demandware\.static/i, /\/on\/demandware\.store\//i],
    cookies: [/^dwsid=/, /^dwanonymous_/],
  },
  {
    name: "Magento / Adobe Commerce",
    category: "Platform",
    html: [/text\/x-magento-init/, /data-mage-init/, /\/static\/version\d+\/frontend\//, /Magento_[A-Z]\w+\//],
    headers: { "x-magento-cache-debug": any, "x-magento-tags": any },
    cookies: [/^mage-cache-/, /^form_key=/],
  },
  {
    name: "PrestaShop",
    category: "Platform",
    meta: { generator: /prestashop/i },
    html: [/var prestashop\s*=/i],
    cookies: [/^PrestaShop-/],
  },
  {
    name: "Wix",
    category: "Platform",
    html: [/static\.wixstatic\.com/i, /static\.parastorage\.com/i, /wix-thunderbolt/i],
    meta: { generator: /wix\.com/i },
    headers: { "x-wix-request-id": any },
    host: [/\.wixsite\.com$/, /\.wixstudio\.io$/],
  },
  {
    name: "Squarespace",
    category: "Platform",
    html: [/static1\.squarespace\.com/i, /Static\.SQUARESPACE_CONTEXT/, /squarespace-cdn\.com/i],
    headers: { server: /squarespace/i },
    host: [/\.squarespace\.com$/],
  },
  {
    name: "Webflow",
    category: "Platform",
    html: [/data-wf-site=/, /data-wf-page=/, /assets(-global)?\.website-files\.com/i, /cdn\.prod\.website-files\.com/i],
    meta: { generator: /webflow/i },
    host: [/\.webflow\.io$/],
  },
  {
    name: "Framer",
    category: "Platform",
    html: [/framerusercontent\.com/i, /data-framer-hydrate/i, /__framer-badge/],
    meta: { generator: /framer/i },
    headers: { server: /^framer/i },
    host: [/\.framer\.(website|ai|app|photos|media|wiki)$/],
  },
  {
    name: "WordPress.com",
    category: "Platform",
    html: [/s[0-2]\.wp\.com\/_static/i, /wordpress\.com\/wp-content/i],
    headers: { "host-header": /wordpress\.com/i },
    host: [/\.wordpress\.com$/],
    implies: ["WordPress"],
  },
  {
    name: "WordPress",
    category: "Platform",
    html: [/\/wp-content\//i, /\/wp-includes\//i, /wp-json/i],
    meta: { generator: /wordpress/i },
    headers: { link: /wp-json|wp\.me/i, "x-pingback": /xmlrpc\.php/i },
  },
  {
    name: "Ghost",
    category: "Platform",
    meta: { generator: /ghost/i },
    html: [/ghost-(portal|search|sodo)/i, /\/ghost\/api\//],
    headers: { "x-ghost-cache-status": any },
  },
  {
    name: "Drupal",
    category: "Platform",
    meta: { generator: /drupal/i },
    html: [/drupal-settings-json/, /Drupal\.settings/, /\/sites\/(default|all)\/(files|themes|modules)\//],
    headers: { "x-drupal-cache": any, "x-drupal-dynamic-cache": any, "x-generator": /drupal/i },
  },
  {
    name: "Joomla",
    category: "Platform",
    meta: { generator: /joomla/i },
    html: [/\/media\/jui\//, /\/media\/system\/js\/core\.js/],
  },
  {
    name: "HubSpot CMS",
    category: "Platform",
    meta: { generator: /hubspot/i },
    html: [/hubspotusercontent[-\w]*\.net\/hubfs/i, /\.hs-sites\.com/i],
    host: [/\.hs-sites\.com$/],
  },
  {
    name: "Duda",
    category: "Platform",
    html: [/irp\.cdn-website\.com/i, /lirp\.cdn-website\.com/i, /dmAPI|dmUserInfo/],
  },
  {
    name: "GoDaddy Website Builder",
    category: "Platform",
    meta: { generator: /starfield|go\s?daddy/i },
    html: [/img\d*\.wsimg\.com\/isteam/i],
  },
  {
    name: "Hostinger Website Builder",
    category: "Platform",
    html: [/userapp\.zyrosite\.com/i, /assets\.zyrosite\.com/i],
    meta: { generator: /hostinger|zyro/i },
    host: [/\.zyrosite\.com$/],
  },
  {
    name: "Weebly",
    category: "Platform",
    html: [/editmysite\.com/i, /weebly\.com\/weebly/i],
    host: [/\.weebly\.com$/],
  },
  {
    name: "Tilda",
    category: "Platform",
    html: [/static\.tildacdn\.com/i, /tilda-blocks/i],
    host: [/\.tilda\.ws$/],
  },
  {
    name: "Jimdo",
    category: "Platform",
    html: [/jimcdn\.com/i, /jimstatic\.com/i],
  },
  {
    name: "Strikingly",
    category: "Platform",
    html: [/strikinglycdn\.com/i],
  },
  {
    name: "Carrd",
    category: "Platform",
    host: [/\.carrd\.co$/],
    html: [/carrd\.co\/static/i],
  },
  {
    name: "Super (Notion)",
    category: "Platform",
    html: [/super-static-assets/i, /super\.so\//i],
  },
  {
    name: "Notion Sites",
    category: "Platform",
    host: [/\.notion\.site$/],
  },
  {
    name: "Bubble",
    category: "Platform",
    html: [/bubble_page_load_data/, /\/package\/run_js\//],
    host: [/\.bubbleapps\.io$/],
  },
];

export const TECHNOLOGIES: Signature[] = [
  // ——— Frameworks ———
  { name: "Shopify Hydrogen", category: "Framework", headers: { "powered-by": /hydrogen/i, "oxygen-full-page-cache": any } },
  { name: "Next.js", category: "Framework", html: [/__NEXT_DATA__/, /\/_next\/static\//], headers: { "x-powered-by": /next\.js/i, "x-nextjs-cache": any }, implies: ["React"] },
  { name: "Nuxt", category: "Framework", html: [/__NUXT__|__NUXT_DATA__/, /\/_nuxt\//], implies: ["Vue.js"] },
  { name: "Gatsby", category: "Framework", html: [/___gatsby/, /gatsby-(image|focus)/], meta: { generator: /gatsby/i }, implies: ["React"] },
  { name: "Astro", category: "Framework", html: [/<astro-island/, /data-astro-cid/], meta: { generator: /astro/i } },
  { name: "SvelteKit", category: "Framework", html: [/__sveltekit_/, /\/_app\/immutable\//] },
  { name: "Remix / React Router", category: "Framework", html: [/__remixContext|__reactRouterContext/], implies: ["React"] },
  { name: "Angular", category: "Framework", html: [/ng-version="/] },
  { name: "Vue.js", category: "Framework", html: [/data-v-[0-9a-f]{8}\b/, /vue(\.runtime)?(\.global)?(\.prod)?(\.min)?\.js/i] },
  { name: "React", category: "Framework", html: [/data-reactroot/, /react-dom(\.production)?(\.min)?\.js/i] },
  { name: "Alpine.js", category: "Framework", html: [/alpinejs/i, /\sx-data=/] },
  { name: "htmx", category: "Framework", html: [/htmx\.org|htmx(\.min)?\.js/i] },
  { name: "jQuery", category: "Framework", html: [/jquery[.-]?(\d[\d.]*)?(\.min)?\.js/i] },
  { name: "Bootstrap", category: "Framework", html: [/bootstrap(\.bundle)?(\.min)?\.(css|js)/i] },
  { name: "Laravel", category: "Framework", cookies: [/^laravel_session=/, /^XSRF-TOKEN=/] },
  { name: "Ruby on Rails", category: "Framework", meta: { "csrf-param": /authenticity_token/ } },
  { name: "ASP.NET", category: "Framework", headers: { "x-aspnet-version": any, "x-powered-by": /asp\.net/i }, html: [/__VIEWSTATE/] },
  { name: "PHP", category: "Framework", headers: { "x-powered-by": /php/i }, cookies: [/^PHPSESSID=/] },

  // ——— WordPress page builders & plugins ———
  { name: "Elementor", category: "Page builder", html: [/elementor-(kit|section|element|widget)/, /\/plugins\/elementor\//], meta: { generator: /elementor/i }, implies: ["WordPress"] },
  { name: "Divi", category: "Page builder", html: [/et_pb_(section|row|module)/, /\/themes\/Divi\//i], implies: ["WordPress"] },
  { name: "WPBakery", category: "Page builder", html: [/vc_row|js_composer/], implies: ["WordPress"] },
  { name: "Beaver Builder", category: "Page builder", html: [/fl-builder-content/, /\/plugins\/bb-plugin\//], implies: ["WordPress"] },
  { name: "Bricks", category: "Page builder", html: [/brxe-/, /\/themes\/bricks\//], implies: ["WordPress"] },
  { name: "Oxygen", category: "Page builder", html: [/\/plugins\/oxygen\//, /\bct-section\b/], implies: ["WordPress"] },
  { name: "Avada Builder", category: "Page builder", html: [/fusion-builder|fusion-(row|layout-column)/], implies: ["WordPress"] },
  { name: "Thrive Architect", category: "Page builder", html: [/tve_(editor|content)|thrive-visual-editor/], implies: ["WordPress"] },
  { name: "Gutenberg blocks", category: "Page builder", html: [/wp-block-(group|columns|cover|buttons)/], implies: ["WordPress"] },
  { name: "WooCommerce", category: "Plugin", html: [/plugins\/woocommerce\//i, /class=["'][^"']*\bwoocommerce(?:-page|-no-js|-js)?\b/i], cookies: [/^woocommerce_/, /^wp_woocommerce_session_/], implies: ["WordPress"] },
  { name: "Yoast SEO", category: "Plugin", html: [/yoast-schema-graph|Yoast SEO plugin/i], implies: ["WordPress"] },
  { name: "Rank Math", category: "Plugin", html: [/rank-math|Rank Math/], implies: ["WordPress"] },
  { name: "All in One SEO", category: "Plugin", html: [/All in One SEO|aioseo/i], implies: ["WordPress"] },
  { name: "WP Rocket", category: "Plugin", html: [/wp-rocket|data-rocket-/i], headers: { "x-rocket-nginx-serving-static": any }, implies: ["WordPress"] },
  { name: "LiteSpeed Cache", category: "Plugin", html: [/litespeed-cache|data-lscache/i], headers: { "x-litespeed-cache": any } },
  { name: "WP Super Cache", category: "Plugin", html: [/WP-Super-Cache/i], implies: ["WordPress"] },
  { name: "W3 Total Cache", category: "Plugin", html: [/W3 Total Cache/i], implies: ["WordPress"] },
  { name: "Autoptimize", category: "Plugin", html: [/\/cache\/autoptimize\//i], implies: ["WordPress"] },
  { name: "Jetpack", category: "Plugin", html: [/\/plugins\/jetpack\/|jetpack-/i, /stats\.wp\.com/i], implies: ["WordPress"] },
  { name: "Contact Form 7", category: "Plugin", html: [/wpcf7/], implies: ["WordPress"] },
  { name: "WPForms", category: "Plugin", html: [/wpforms/i], implies: ["WordPress"] },
  { name: "Gravity Forms", category: "Plugin", html: [/gform_wrapper|gravityforms/i], implies: ["WordPress"] },
  { name: "WPML", category: "Plugin", html: [/\/plugins\/sitepress-multilingual-cms\//, /wpml-ls/], implies: ["WordPress"] },
  { name: "Polylang", category: "Plugin", html: [/\/plugins\/polylang/], implies: ["WordPress"] },

  // ——— Analytics ———
  { name: "Google Analytics 4", category: "Analytics", html: [/gtag\/js\?id=G-/, /gtag\(\s*['"]config['"]\s*,\s*['"]G-/, /['"]G-[A-Z0-9]{6,12}['"]/] },
  { name: "Universal Analytics (retired)", category: "Analytics", html: [/google-analytics\.com\/(analytics|ga)\.js/, /['"]UA-\d{4,10}-\d{1,4}['"]/] },
  { name: "Shopify Analytics", category: "Analytics", html: [/ShopifyAnalytics/] },
  { name: "Hotjar", category: "Analytics", html: [/static\.hotjar\.com|hotjar\.com\/c\/hotjar-/i] },
  { name: "Microsoft Clarity", category: "Analytics", html: [/clarity\.ms\/tag/i] },
  { name: "Plausible", category: "Analytics", html: [/plausible\.io\/js/i] },
  { name: "Fathom", category: "Analytics", html: [/cdn\.usefathom\.com/i] },
  { name: "Matomo", category: "Analytics", html: [/matomo\.(js|php)|piwik\.(js|php)/i] },
  { name: "Mixpanel", category: "Analytics", html: [/cdn\.mxpnl\.com|mixpanel\.init/i] },
  { name: "Segment", category: "Analytics", html: [/cdn\.segment\.com\/analytics\.js/i] },
  { name: "Heap", category: "Analytics", html: [/cdn\.heapanalytics\.com|heap\.load\(/i] },
  { name: "Amplitude", category: "Analytics", html: [/cdn\.amplitude\.com|amplitude\.getInstance|@amplitude\/analytics/i] },
  { name: "PostHog", category: "Analytics", html: [/posthog\.init|posthog\.com\/static|i\.posthog\.com/i] },
  { name: "Vercel Analytics", category: "Analytics", html: [/\/_vercel\/insights\/script\.js/] },
  { name: "Lucky Orange", category: "Analytics", html: [/luckyorange\.(com|net)/i] },
  { name: "FullStory", category: "Analytics", html: [/fullstory\.com\/s\/fs\.js|edge\.fullstory\.com/i] },

  // ——— Tag managers ———
  { name: "Google Tag Manager", category: "Tag manager", html: [/googletagmanager\.com\/gtm\.js/, /GTM-[A-Z0-9]{4,9}/] },
  { name: "Tealium", category: "Tag manager", html: [/tags\.tiqcdn\.com/i] },

  // ——— Advertising pixels ———
  { name: "Meta Pixel", category: "Advertising", html: [/connect\.facebook\.net\/[^"']*\/fbevents\.js/, /fbq\(\s*['"]init['"]/] },
  { name: "Google Ads", category: "Advertising", html: [/googleadservices\.com\/pagead\/conversion/, /['"]AW-\d{6,12}['"]/] },
  { name: "TikTok Pixel", category: "Advertising", html: [/analytics\.tiktok\.com/i] },
  { name: "LinkedIn Insight", category: "Advertising", html: [/snap\.licdn\.com/i] },
  { name: "Pinterest Tag", category: "Advertising", html: [/s\.pinimg\.com\/ct\/core\.js|pintrk\(/] },
  { name: "Snap Pixel", category: "Advertising", html: [/sc-static\.net\/scevent/i] },
  { name: "Microsoft Ads (UET)", category: "Advertising", html: [/bat\.bing\.com\/bat\.js/i] },
  { name: "X (Twitter) Pixel", category: "Advertising", html: [/static\.ads-twitter\.com/i] },
  { name: "Reddit Pixel", category: "Advertising", html: [/redditstatic\.com\/ads/i] },
  { name: "Google AdSense", category: "Advertising", html: [/pagead2\.googlesyndication\.com/i] },

  // ——— Marketing / email / CRM ———
  { name: "Klaviyo", category: "Marketing", html: [/static\.klaviyo\.com|klaviyo\.com\/onsite/i] },
  { name: "Mailchimp", category: "Marketing", html: [/chimpstatic\.com|list-manage\.com/i] },
  { name: "HubSpot", category: "Marketing", html: [/js\.hs-scripts\.com|js\.hsforms\.net|js\.hs-analytics\.net|js\.hubspot\.com/i] },
  { name: "Omnisend", category: "Marketing", html: [/omnisnippet|omnisrc\.com/i] },
  { name: "Privy", category: "Marketing", html: [/widget\.privy\.com/i] },
  { name: "Attentive", category: "Marketing", html: [/cdn\.attn\.tv/i] },
  { name: "Postscript", category: "Marketing", html: [/sdk\.postscript\.io/i] },
  { name: "ActiveCampaign", category: "Marketing", html: [/trackcmp\.net|activehosted\.com/i] },
  { name: "Kit (ConvertKit)", category: "Marketing", html: [/convertkit\.com|\.ck\.page|kit\.com\/forms/i] },
  { name: "Brevo", category: "Marketing", html: [/sibautomation\.com|sibforms\.com|brevo\.com\/js/i] },
  { name: "OptinMonster", category: "Marketing", html: [/omappapi\.com|optinmonster/i] },
  { name: "Justuno", category: "Marketing", html: [/justuno\.com/i] },
  { name: "Smile.io", category: "Marketing", html: [/cdn\.sweettooth\.io|smile\.io/i] },
  { name: "Recharge", category: "Marketing", html: [/rechargecdn\.com|rechargepayments\.com/i] },
  { name: "Rebuy", category: "Marketing", html: [/rebuyengine\.com/i] },
  { name: "Bold Commerce", category: "Marketing", html: [/boldapps\.net|boldcommerce\.com/i] },
  { name: "Salesforce Marketing Cloud", category: "Marketing", html: [/exacttarget\.com|igodigital\.com/i] },
  { name: "Marketo", category: "Marketing", html: [/munchkin\.marketo\.net|mktoForms/i] },

  // ——— Reviews ———
  { name: "Judge.me", category: "Reviews", html: [/judge\.me|judgeme/i] },
  { name: "Yotpo", category: "Reviews", html: [/yotpo\.com/i] },
  { name: "Okendo", category: "Reviews", html: [/okendo\.io/i] },
  { name: "Stamped.io", category: "Reviews", html: [/stamped\.io/i] },
  { name: "Loox", category: "Reviews", html: [/loox\.io/i] },
  { name: "Trustpilot", category: "Reviews", html: [/widget\.trustpilot\.com/i] },
  { name: "Reviews.io", category: "Reviews", html: [/widget\.reviews\.io|reviews\.co\.uk/i] },

  // ——— Chat & support ———
  { name: "Intercom", category: "Chat & support", html: [/widget\.intercom\.io|intercomcdn\.com|intercomSettings/i] },
  { name: "Drift", category: "Chat & support", html: [/js\.driftt\.com/i] },
  { name: "Tidio", category: "Chat & support", html: [/code\.tidio\.co/i] },
  { name: "Crisp", category: "Chat & support", html: [/client\.crisp\.chat/i] },
  { name: "Zendesk", category: "Chat & support", html: [/static\.zdassets\.com|zopim/i] },
  { name: "Tawk.to", category: "Chat & support", html: [/embed\.tawk\.to/i] },
  { name: "LiveChat", category: "Chat & support", html: [/cdn\.livechatinc\.com/i] },
  { name: "Gorgias", category: "Chat & support", html: [/gorgias\.(chat|io)/i] },
  { name: "Freshchat", category: "Chat & support", html: [/wchat\.freshchat\.com|freshworks\.com\/widget/i] },
  { name: "Olark", category: "Chat & support", html: [/static\.olark\.com/i] },
  { name: "WhatsApp chat link", category: "Chat & support", html: [/wa\.me\/\d|api\.whatsapp\.com\/send/i] },

  // ——— Payments ———
  { name: "Stripe", category: "Payments", html: [/js\.stripe\.com/i] },
  { name: "PayPal", category: "Payments", html: [/paypal\.com\/sdk\/js|paypalobjects\.com/i] },
  { name: "Shop Pay", category: "Payments", html: [/shop-pay|shopPay|shop_pay/] },
  { name: "Klarna", category: "Payments", html: [/klarna(services|cdn)?\.(com|net)|klarna-placement/i] },
  { name: "Afterpay / Clearpay", category: "Payments", html: [/afterpay|clearpay/i] },
  { name: "Affirm", category: "Payments", html: [/cdn1\.affirm\.com|affirm\.com\/js/i] },
  { name: "Sezzle", category: "Payments", html: [/sezzle\.com|sezzle-(widget|checkout)/i] },
  { name: "Square", category: "Payments", html: [/squarecdn\.com|web\.squarecdn|js\.squareup\.com/i] },
  { name: "Razorpay", category: "Payments", html: [/checkout\.razorpay\.com/i] },
  { name: "Apple Pay", category: "Payments", html: [/ApplePaySession|apple-pay-button/] },
  { name: "Google Pay", category: "Payments", html: [/pay\.google\.com\/gp\/p\/js/i] },

  // ——— Search & merchandising ———
  { name: "Algolia", category: "Search & merch", html: [/algolia(net)?\.(com|net)|algoliasearch/i] },
  { name: "Klevu", category: "Search & merch", html: [/klevu\.com/i] },
  { name: "Searchanise", category: "Search & merch", html: [/searchanise/i] },
  { name: "Nosto", category: "Search & merch", html: [/connect\.nosto\.com/i] },

  // ——— Cookie consent ———
  { name: "OneTrust", category: "Cookie consent", html: [/cdn\.cookielaw\.org|onetrust/i] },
  { name: "Cookiebot", category: "Cookie consent", html: [/consent\.cookiebot\.com/i] },
  { name: "CookieYes", category: "Cookie consent", html: [/cookieyes\.com|cky-consent/i] },
  { name: "Termly", category: "Cookie consent", html: [/app\.termly\.io/i] },
  { name: "Osano", category: "Cookie consent", html: [/cmp\.osano\.com/i] },
  { name: "iubenda", category: "Cookie consent", html: [/cdn\.iubenda\.com/i] },
  { name: "Complianz", category: "Cookie consent", html: [/cmplz-/] },
  { name: "Usercentrics", category: "Cookie consent", html: [/usercentrics\.eu/i] },

  // ——— Security ———
  { name: "reCAPTCHA", category: "Security", html: [/google\.com\/recaptcha|grecaptcha/i] },
  { name: "hCaptcha", category: "Security", html: [/hcaptcha\.com/i] },
  { name: "Cloudflare Turnstile", category: "Security", html: [/challenges\.cloudflare\.com\/turnstile/i] },
  { name: "HSTS", category: "Security", headers: { "strict-transport-security": any } },

  // ——— Hosting & CDN ———
  { name: "Cloudflare", category: "Hosting & CDN", headers: { "cf-ray": any, server: /cloudflare/i } },
  { name: "Vercel", category: "Hosting & CDN", headers: { "x-vercel-id": any, server: /^vercel/i } },
  { name: "Netlify", category: "Hosting & CDN", headers: { "x-nf-request-id": any, server: /^netlify/i } },
  { name: "Amazon CloudFront", category: "Hosting & CDN", headers: { "x-amz-cf-id": any, via: /cloudfront/i } },
  { name: "Amazon S3", category: "Hosting & CDN", headers: { server: /^AmazonS3/i } },
  { name: "Fastly", category: "Hosting & CDN", headers: { "x-fastly-request-id": any, "fastly-debug-digest": any } },
  { name: "Akamai", category: "Hosting & CDN", headers: { "x-akamai-transformed": any, server: /akamai/i } },
  { name: "Google Cloud", category: "Hosting & CDN", headers: { via: /1\.1 google/i, server: /^(gws|Google Frontend)/i } },
  { name: "Firebase Hosting", category: "Hosting & CDN", headers: { "x-firebase-hosting": any }, host: [/\.web\.app$|\.firebaseapp\.com$/] },
  { name: "GitHub Pages", category: "Hosting & CDN", headers: { server: /^GitHub\.com/i }, host: [/\.github\.io$/] },
  { name: "Heroku", category: "Hosting & CDN", headers: { via: /vegur/i }, host: [/\.herokuapp\.com$/] },
  { name: "Render", category: "Hosting & CDN", headers: { "rndr-id": any } },
  { name: "Fly.io", category: "Hosting & CDN", headers: { "fly-request-id": any } },
  { name: "WP Engine", category: "Hosting & CDN", headers: { "x-powered-by": /wp engine/i, "wpe-backend": any } },
  { name: "Kinsta", category: "Hosting & CDN", headers: { "x-kinsta-cache": any } },
  { name: "Pantheon", category: "Hosting & CDN", headers: { "x-pantheon-styx-hostname": any } },
  { name: "WordPress VIP", category: "Hosting & CDN", headers: { "x-powered-by": /wordpress vip/i } },
  { name: "Flywheel", category: "Hosting & CDN", headers: { "x-fw-hash": any, "x-fw-serve": any } },
  { name: "Hostinger", category: "Hosting & CDN", headers: { platform: /hostinger/i, "x-hcdn-request-id": any } },
  { name: "SiteGround", category: "Hosting & CDN", html: [/\/plugins\/sg-cachepress\//], headers: { "x-proxy-cache-info": any } },
  { name: "Bunny CDN", category: "Hosting & CDN", headers: { server: /^BunnyCDN/i }, html: [/\.b-cdn\.net/i] },
  { name: "jsDelivr", category: "Hosting & CDN", html: [/cdn\.jsdelivr\.net/i] },
  { name: "cdnjs", category: "Hosting & CDN", html: [/cdnjs\.cloudflare\.com/i] },
  { name: "unpkg", category: "Hosting & CDN", html: [/unpkg\.com/i] },

  // ——— Web servers ———
  { name: "Nginx", category: "Web server", headers: { server: /nginx/i } },
  { name: "Apache", category: "Web server", headers: { server: /apache/i } },
  { name: "LiteSpeed", category: "Web server", headers: { server: /litespeed/i } },
  { name: "Microsoft IIS", category: "Web server", headers: { server: /iis/i } },
  { name: "OpenResty", category: "Web server", headers: { server: /openresty/i } },
  { name: "Caddy", category: "Web server", headers: { server: /caddy/i } },

  // ——— Fonts ———
  { name: "Google Fonts", category: "Fonts", html: [/fonts\.googleapis\.com|fonts\.gstatic\.com/i] },
  { name: "Adobe Fonts", category: "Fonts", html: [/use\.typekit\.net|p\.typekit\.net/i] },
  { name: "Font Awesome", category: "Fonts", html: [/font-?awesome|kit\.fontawesome\.com/i] },
  { name: "Bunny Fonts", category: "Fonts", html: [/fonts\.bunny\.net/i] },

  // ——— Media ———
  { name: "YouTube embed", category: "Media", html: [/youtube(-nocookie)?\.com\/embed\//i] },
  { name: "Vimeo", category: "Media", html: [/player\.vimeo\.com/i] },
  { name: "Wistia", category: "Media", html: [/fast\.wistia\.(com|net)/i] },
  { name: "Cloudinary", category: "Media", html: [/res\.cloudinary\.com/i] },
  { name: "imgix", category: "Media", html: [/\.imgix\.net/i] },
  { name: "Lottie", category: "Media", html: [/lottie(-player|files)?/i] },

  // ——— Scheduling & forms ———
  { name: "Calendly", category: "Scheduling & forms", html: [/assets\.calendly\.com|calendly\.com\/[a-z0-9-]+/i] },
  { name: "Typeform", category: "Scheduling & forms", html: [/embed\.typeform\.com|\.typeform\.com\/to\//i] },
  { name: "Jotform", category: "Scheduling & forms", html: [/jotform\.(com|us)/i] },
  { name: "Google Forms", category: "Scheduling & forms", html: [/docs\.google\.com\/forms/i] },
  { name: "Tally", category: "Scheduling & forms", html: [/tally\.so\/(embed|widgets)/i] },
];

/** Categories that count as installed add-ons/apps (used for the "apps detected" number). */
export const APP_CATEGORIES: Category[] = [
  "Marketing",
  "Reviews",
  "Chat & support",
  "Search & merch",
  "Cookie consent",
  "Scheduling & forms",
];
