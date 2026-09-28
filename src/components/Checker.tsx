"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import { authEnabled } from "@/lib/supabase-browser";
import type { Confidence, Issue, PublicResult, Scores, Severity, Usage } from "@/lib/types";
import RequestDialog from "./RequestDialog";

const STEPS = [
  "Fetching the homepage",
  "Matching platform fingerprints",
  "Reading the theme",
  "Checking plan and hosting signals",
  "Listing apps and tools",
];

const PLATFORMS = ["Shopify", "WordPress", "Webflow", "Framer", "Wix", "Squarespace", "WooCommerce", "BigCommerce", "Next.js"];

type ScoreState = { status: "idle" | "loading" | "done" | "error"; data?: Scores; error?: string };
type Me = { email: string | null; name: string | null } | null;

export default function Checker() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error" | "limit">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<PublicResult | null>(null);
  const [error, setError] = useState("");
  const [scores, setScores] = useState<ScoreState>({ status: "idle" });
  const [usage, setUsage] = useState<Usage | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [requesting, setRequesting] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const run = useRef(0);

  function showResult(r: PublicResult, current: number) {
    setResult(r);
    setUrl(r.domain);
    setPhase("done");
    if (r.id) window.history.replaceState(null, "", `?id=${r.id}`);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    if (r.scores) setScores({ status: "done", data: r.scores });
    else if (r.id) loadScores(r.id, current);
  }

  async function analyze(target: string) {
    const current = ++run.current;
    setPhase("loading");
    setStep(0);
    setError("");
    setResult(null);
    setScores({ status: "idle" });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (current !== run.current) return;
      if (data.usage) setUsage(data.usage);
      if (res.status === 429 && data.code) {
        setError(data.error);
        setPhase("limit");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      showResult(data.result as PublicResult, current);
    } catch (err) {
      if (current !== run.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  async function reopen(id: string) {
    const current = ++run.current;
    setPhase("loading");
    try {
      const res = await fetch(`/api/result?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (current !== run.current) return;
      if (!res.ok) throw new Error(data.error);
      showResult(data.result as PublicResult, current);
    } catch (err) {
      if (current !== run.current) return;
      setError(err instanceof Error ? err.message : "Couldn't load that result.");
      setPhase("error");
    }
  }

  async function loadScores(id: string, current: number) {
    setScores({ status: "loading" });
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (current !== run.current) return;
      if (!res.ok) throw new Error(data.error);
      setScores({ status: "done", data });
    } catch (err) {
      if (current !== run.current) return;
      setScores({ status: "error", error: err instanceof Error ? err.message : "Speed score unavailable." });
    }
  }

  // Cycle the loading messages.
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, [phase]);

  // On load: fetch today's usage, then reopen /?id=… results or run /?url=… checks.
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        setUsage(d.usage);
        setMe(d.user);
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const initial = params.get("url");
    if (id) reopen(id);
    else if (initial) {
      setUrl(initial);
      analyze(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) document.getElementById("site-url")?.focus();
    else if (phase !== "loading") analyze(url);
  }

  const signUpHref = `/signup?next=${encodeURIComponent(result?.id ? `/?id=${result.id}` : "/")}`;
  const intro = phase === "idle" || phase === "error" || phase === "limit";

  return (
    <div>
      <section className={`print:hidden ${intro ? "pt-12 pb-10 sm:pt-24" : "pt-6 pb-6"}`}>
        {intro && <p className="eyebrow">Website platform detector</p>}
        <h1
          className={`font-bold tracking-[-0.035em] text-balance ${intro ? "mt-3 text-[2.5rem] leading-[1.02] sm:text-[4.25rem]" : "text-2xl sm:text-3xl"}`}
        >
          What is this website built with?
        </h1>
        {intro && (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
            Enter any address to see the platform, theme, likely plan, hosting and tools behind it. You also get a Google speed score
            and a quick SEO check.
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_0_rgba(0,0,0,0.03),0_12px_32px_-18px_rgba(21,22,26,0.25)] focus-within:border-ink-2 sm:flex-row ${intro ? "mt-8" : "mt-4"}`}
        >
          <label htmlFor="site-url" className="sr-only">
            Website address
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-3">
            <span aria-hidden className="font-mono text-sm text-muted">
              https://
            </span>
            <input
              id="site-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="allbirds.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted/70"
            />
          </div>
          <button type="submit" disabled={phase === "loading"} className="btn btn-primary h-12 px-6">
            {phase === "loading" ? "Detecting…" : "Detect platform"}
          </button>
        </form>

        {usage && <UsageLine usage={usage} signUpHref={signUpHref} />}

        {phase === "error" && (
          <p role="alert" className="mt-4 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-ink">
            <span className="font-semibold text-bad">Couldn&apos;t check that site. </span>
            {error}
          </p>
        )}

        {phase === "idle" && (
          <div className="mt-12 border-t border-line pt-6">
            <p className="eyebrow">Detects</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <li key={p} className="rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-[13px] text-ink-2">
                  {p}
                </li>
              ))}
              <li className="px-1 py-1.5 font-mono text-[13px] font-medium text-accent">+100 more</li>
            </ul>
          </div>
        )}
      </section>

      {phase === "limit" && <LimitCard message={error} signedIn={usage?.signedIn ?? false} signUpHref={signUpHref} />}

      {phase === "loading" && <Loading step={step} />}

      {phase === "done" && result && (
        <div ref={resultRef} className="scroll-mt-4 space-y-4 pb-6">
          {result.detailed ? <ReportBar result={result} /> : <UnlockBanner signUpHref={signUpHref} />}
          <Summary result={result} />
          <Technologies result={result} signUpHref={signUpHref} />
          <WebsiteCta result={result} onRequest={() => setRequesting(true)} />
          <SpeedCard state={scores} hasId={Boolean(result.id)} />
          <SeoChecks result={result} signUpHref={signUpHref} />
          <p className="hidden text-xs text-muted print:block">
            Report by {site.name} · {site.ownerName}. “Likely plan” is an estimate from publicly visible signals.
          </p>
        </div>
      )}

      <RequestDialog
        open={requesting}
        onClose={() => setRequesting(false)}
        inspiredBy={result?.domain}
        checkId={result?.id}
        defaultName={me?.name ?? ""}
        defaultEmail={me?.email ?? ""}
      />
    </div>
  );
}

// ——————————————————————————————————————————————————————————————— pieces

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-7 ${className}`}>{children}</section>;
}

function CardTitle({ eyebrow, title, aside }: { eyebrow: string; title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold tracking-[-0.02em]">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

function UsageLine({ usage, signUpHref }: { usage: Usage; signUpHref: string }) {
  if (usage.signedIn) {
    return <p className="mt-3 pl-1 text-sm text-muted print:hidden">Signed in · unlimited checks and full reports</p>;
  }
  return (
    <p className="mt-3 pl-1 text-sm text-muted print:hidden">
      {usage.remaining} of {usage.limit} free check{usage.limit === 1 ? "" : "s"} left today
      {authEnabled && (
        <>
          {" · "}
          <Link href={signUpHref} className="font-semibold text-accent underline-offset-4 hover:underline">
            Sign up for unlimited
          </Link>
        </>
      )}
    </p>
  );
}

function LimitCard({ message, signedIn, signUpHref }: { message: string; signedIn: boolean; signUpHref: string }) {
  return (
    <Card>
      <CardTitle eyebrow="Daily limit" title={signedIn ? "Please try again tomorrow" : "You've used today's free checks"} />
      <p className="mt-2 text-ink-2">{message}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {!signedIn && authEnabled && (
          <Link href={signUpHref} className="btn btn-primary">
            Sign up free
          </Link>
        )}
        <Link href="/request" className="btn btn-ghost">
          Request a website
        </Link>
      </div>
    </Card>
  );
}

/** Signed-in users: report title (also printed at the top of the PDF) and the download button. */
function ReportBar({ result }: { result: PublicResult }) {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 sm:px-7 print:border-0 print:px-0">
      <div>
        <p className="eyebrow">Full report</p>
        <p className="mt-0.5 font-semibold">
          {result.domain} <span className="font-normal text-muted">· {date}</span>
        </p>
        <p className="hidden text-xs text-muted print:block">
          {site.name} by {site.ownerName}
        </p>
      </div>
      <button onClick={() => window.print()} className="btn btn-primary btn-sm print:hidden">
        <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" />
        </svg>
        Download PDF
      </button>
    </div>
  );
}

function UnlockBanner({ signUpHref }: { signUpHref: string }) {
  if (!authEnabled) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <p className="text-sm text-ink-2">
        <span className="font-semibold text-ink">This is a preview.</span> Sign up free for the full report: the whole tech stack, how we
        identified the platform, every SEO check and a PDF download. Unlimited checks included.
      </p>
      <Link href={signUpHref} className="btn btn-primary btn-sm shrink-0">
        Sign up free
      </Link>
    </div>
  );
}

function Loading({ step }: { step: number }) {
  return (
    <Card>
      <ol className="space-y-3 font-mono text-sm" aria-live="polite">
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center gap-3 ${i > step ? "text-muted/70" : "text-ink"}`}>
            <span aria-hidden className="w-5 text-center">
              {i < step ? <span className="text-good">✓</span> : i === step ? <span className="inline-block size-2 animate-pulse rounded-full bg-accent" /> : "·"}
            </span>
            {label}
            {i === step && "…"}
          </li>
        ))}
      </ol>
    </Card>
  );
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Likely",
  low: "Estimate",
};

function ConfidencePill({ level }: { level: Confidence }) {
  const tone = level === "high" ? "bg-good-soft text-good" : level === "medium" ? "bg-surface-2 text-ink-2" : "bg-surface-2 text-muted";
  return <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase ${tone}`}>{CONFIDENCE_LABEL[level]}</span>;
}

function Summary({ result }: { result: PublicResult }) {
  const r = result;
  const techTotal = r.technologies.length - 1 + r.hiddenTechCount;
  return (
    <Card>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.domain)}&sz=64`}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-md border border-line bg-surface-2"
        />
        <div className="min-w-0">
          <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate font-semibold hover:underline">
            {r.domain}
          </a>
          {r.pageTitle && <p className="truncate text-sm text-muted">{r.pageTitle}</p>}
        </div>
      </div>

      <p className="eyebrow mt-7">Built with</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <span className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">{r.platform.name}</span>
        <ConfidencePill level={r.platform.confidence} />
      </div>

      <dl className="mt-7 grid grid-cols-1 border-t border-line sm:grid-cols-2">
        <Row label="Theme">
          {r.theme ? (
            <>
              <span className="font-semibold">{r.theme.name}</span>
              {r.theme.detail && <span className="mt-0.5 block text-sm text-muted">{r.theme.detail}</span>}
            </>
          ) : (
            <span className="text-muted">Not publicly exposed</span>
          )}
        </Row>
        <Row label="Likely plan / hosting">
          {r.likelyPlan ? (
            <>
              <span className="font-semibold">{r.likelyPlan.label}</span>
              <span className="ml-2 align-middle">
                <ConfidencePill level={r.likelyPlan.confidence} />
              </span>
              <span className="mt-0.5 block text-sm text-muted">{r.likelyPlan.reason}</span>
            </>
          ) : (
            <span className="text-muted">Not determinable</span>
          )}
        </Row>
        <Row label="Apps & tools">
          <span className="text-2xl font-bold tracking-tight">{techTotal}</span>
          <span className="ml-2 text-sm text-muted">
            {r.appsCount > 0 ? `incl. ${r.appsCount} marketing & support app${r.appsCount === 1 ? "" : "s"}` : techTotal === 1 ? "technology" : "technologies"}
          </span>
        </Row>
        <Row label="SEO checks">
          <span className="text-2xl font-bold tracking-tight">{r.issueSummary.total}</span>
          <span className="ml-2 text-sm text-muted">{r.issueSummary.total === 0 ? "all passed" : "flagged"}</span>
        </Row>
      </dl>

      {r.detailed && r.platform.evidence.length > 0 && (
        <div className="mt-5 rounded-xl bg-surface-2 p-4">
          <p className="eyebrow">How we identified {r.platform.name}</p>
          <ul className="mt-2 space-y-1 font-mono text-[13px] break-words text-ink-2">
            {r.platform.evidence.map((e) => (
              <li key={e}>→ {e}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-4 sm:odd:pr-6 sm:even:border-l sm:even:pl-6 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

function Technologies({ result, signUpHref }: { result: PublicResult; signUpHref: string }) {
  const groups = new Map<string, string[]>();
  for (const t of result.technologies) {
    if (t.category === "Platform") continue;
    groups.set(t.category, [...(groups.get(t.category) ?? []), t.name]);
  }
  if (groups.size === 0 && result.hiddenTechCount === 0) return null;
  return (
    <Card>
      <CardTitle eyebrow="Tech stack" title="Apps, tools and services" />
      <dl className="mt-5 divide-y divide-line">
        {[...groups].map(([category, names]) => (
          <div key={category} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[11rem_1fr]">
            <dt className="text-sm text-muted">{category}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {names.map((n) => (
                <span key={n} className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[13px]">
                  {n}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {result.hiddenTechCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <span className="text-ink-2">
            <span className="font-semibold text-ink">+{result.hiddenTechCount} more</span> detected. The full list is in the full report.
          </span>
          {authEnabled && (
            <Link href={signUpHref} className="btn btn-primary btn-sm">
              Sign up free
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}

function WebsiteCta({ result, onRequest }: { result: PublicResult; onRequest: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-ink sm:p-8 print:hidden">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="font-mono text-[11px] tracking-[0.08em] uppercase opacity-60">Built by {site.ownerName}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em]">Want a website like {result.domain}?</h2>
          <p className="mt-2 text-sm leading-relaxed opacity-75">
            We design and build fast sites on Shopify, WordPress, Webflow, Framer or custom code. Tell us what you need and get a free
            quote.
          </p>
        </div>
        <button onClick={onRequest} className="btn btn-accent shrink-0">
          Request a website
        </button>
      </div>
    </section>
  );
}

function scoreStatus(n: number) {
  if (n >= 90) return { label: "Good", tone: "text-good", bar: "bg-good" };
  if (n >= 50) return { label: "Needs work", tone: "text-warn", bar: "bg-warn" };
  return { label: "Poor", tone: "text-bad", bar: "bg-bad" };
}

function SpeedCard({ state, hasId }: { state: ScoreState; hasId: boolean }) {
  // Google sometimes can't score a site (blocked, timeout, quota); leave the card out rather than show an error.
  if (!hasId || state.status === "error") return null;
  const items: [string, number | null | undefined][] = [
    ["Performance", state.data?.performance],
    ["SEO", state.data?.seo],
    ["Accessibility", state.data?.accessibility],
    ["Best practices", state.data?.bestPractices],
  ];
  return (
    <Card>
      <CardTitle eyebrow="Google PageSpeed · mobile" title="Speed score" />
      <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map(([label, value]) => {
              const s = value != null ? scoreStatus(value) : null;
              return (
                <div key={label} className="rounded-xl border border-line p-4">
                  <p className="text-sm text-muted">{label}</p>
                  {state.status === "done" && value != null && s ? (
                    <>
                      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
                      <div className="mt-2 h-1 rounded-full bg-surface-2">
                        <div className={`h-1 rounded-full ${s.bar}`} style={{ width: `${value}%` }} />
                      </div>
                      <p className={`mt-1.5 text-xs font-semibold ${s.tone}`}>{s.label}</p>
                    </>
                  ) : state.status === "done" ? (
                    <p className="mt-1 text-3xl font-bold text-muted">–</p>
                  ) : (
                    <>
                      <div className="skeleton mt-2 h-8 w-12 rounded" />
                      <div className="skeleton mt-3 h-1 w-full rounded" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {state.status === "loading" && (
            <p className="mt-3 text-xs text-muted" aria-live="polite">
              Google is loading the page on a simulated phone. This usually takes 15–30 seconds…
            </p>
          )}
          {state.status === "done" && state.data && (
            <p className="mt-4 font-mono text-[13px] text-ink-2">
              LCP {state.data.lcp ?? "–"} · CLS {state.data.cls ?? "–"} · TBT {state.data.tbt ?? "–"}
            </p>
          )}
      </>
    </Card>
  );
}

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  high: { label: "High", className: "bg-bad-soft text-bad" },
  medium: { label: "Medium", className: "bg-warn-soft text-warn" },
  low: { label: "Low", className: "bg-surface-2 text-ink-2" },
};

function IssueItem({ issue }: { issue: Issue }) {
  const s = SEVERITY[issue.severity];
  return (
    <li className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:gap-4">
      <span className={`h-fit w-fit shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase sm:w-16 sm:text-center ${s.className}`}>
        {s.label}
      </span>
      <div>
        <p className="font-semibold">{issue.title}</p>
        <p className="text-sm text-ink-2">{issue.detail}</p>
      </div>
    </li>
  );
}

function SeoChecks({ result, signUpHref }: { result: PublicResult; signUpHref: string }) {
  const { issueSummary: sum } = result;
  return (
    <Card>
      <CardTitle
        eyebrow="SEO & setup basics"
        title={sum.total === 0 ? "No problems found" : `${sum.total} check${sum.total === 1 ? "" : "s"} flagged`}
        aside={
          sum.total > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(["high", "medium", "low"] as const)
                .filter((k) => sum[k] > 0)
                .map((k) => (
                  <span key={k} className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase ${SEVERITY[k].className}`}>
                    {sum[k]} {SEVERITY[k].label}
                  </span>
                ))}
            </div>
          )
        }
      />

      {sum.total === 0 ? (
        <p className="mt-2 text-sm text-ink-2">Title, description, headings, mobile setup, social image and the other basics all look fine.</p>
      ) : result.issues ? (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {result.issues.map((i) => (
            <IssueItem key={i.id} issue={i} />
          ))}
        </ul>
      ) : (
        <>
          {sum.teaser && (
            <ul className="mt-4 border-t border-line">
              <IssueItem issue={sum.teaser} />
            </ul>
          )}
          {sum.total > 1 && (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <span className="text-ink-2">
                <span className="font-semibold text-ink">+{sum.total - 1} more</span> in the full report. Sign up free to see them all.
              </span>
              {authEnabled && (
                <Link href={signUpHref} className="btn btn-primary btn-sm">
                  Sign up free
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
