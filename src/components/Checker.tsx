"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import { authEnabled } from "@/lib/supabase-browser";
import type { Confidence, Issue, PublicResult, Scores, Severity, Usage } from "@/lib/types";
import RequestDialog from "./RequestDialog";

const STEPS = [
  "Fetching the homepage",
  "Detecting the platform",
  "Identifying the theme",
  "Scanning for apps and tools",
  "Reviewing UX and SEO basics",
];

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
      setScores({ status: "error", error: err instanceof Error ? err.message : "Scores unavailable." });
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
    if (url.trim() && phase !== "loading") analyze(url);
  }

  const signInHref = `/signin?next=${encodeURIComponent(result?.id ? `/?id=${result.id}` : "/")}`;

  return (
    <div>
      <section className={`print:hidden ${phase === "idle" || phase === "error" || phase === "limit" ? "pt-10 pb-8 sm:pt-20" : "pt-6 pb-6"}`}>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">What is this website built with?</h1>
        <p className="mt-3 max-w-xl text-base text-ink-2 sm:text-lg">
          Enter any website to see its platform, theme, likely plan and tools, plus a quick review of what could be improved.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="site-url" className="sr-only">
            Website address
          </label>
          <input
            id="site-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 text-base text-ink shadow-sm outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            disabled={phase === "loading" || !url.trim()}
            className="h-12 rounded-lg bg-accent px-6 font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "loading" ? "Analysing…" : "Analyse website"}
          </button>
        </form>

        {usage && <UsageLine usage={usage} signInHref={signInHref} />}

        {phase === "error" && (
          <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-ink">
            <span className="font-medium text-bad">Couldn&apos;t check that site. </span>
            {error}
          </p>
        )}
      </section>

      {phase === "limit" && <LimitCard message={error} signedIn={usage?.signedIn ?? false} signInHref={signInHref} />}

      {phase === "loading" && <Loading step={step} />}

      {phase === "done" && result && (
        <div ref={resultRef} className="scroll-mt-4 space-y-4 pb-6">
          {result.detailed ? <ReportBar result={result} /> : <UnlockBanner signInHref={signInHref} />}
          <Summary result={result} />
          <ScoresCard state={scores} hasId={Boolean(result.id)} />
          <Opportunities result={result} signInHref={signInHref} />
          <WebsiteCta result={result} onRequest={() => setRequesting(true)} />
          <Technologies result={result} signInHref={signInHref} />
          <p className="hidden text-xs text-muted print:block">
            Report generated by {site.name} · {site.ownerName} · “Likely plan” is an estimate from publicly visible signals.
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

function UsageLine({ usage, signInHref }: { usage: Usage; signInHref: string }) {
  if (usage.signedIn) {
    return <p className="mt-3 text-sm text-muted print:hidden">✓ Signed in: unlimited checks and detailed reports</p>;
  }
  return (
    <p className="mt-3 text-sm text-muted print:hidden">
      {usage.remaining} of {usage.limit} free check{usage.limit === 1 ? "" : "s"} left today
      {authEnabled && (
        <>
          {" · "}
          <Link href={signInHref} className="font-medium text-accent hover:underline">
            Sign in free for unlimited checks
          </Link>
        </>
      )}
    </p>
  );
}

function LimitCard({ message, signedIn, signInHref }: { message: string; signedIn: boolean; signInHref: string }) {
  return (
    <Card className="border-accent/40">
      <h2 className="text-lg font-semibold">{signedIn ? "Please try again tomorrow" : "You've used your free checks"}</h2>
      <p className="mt-1 text-ink-2">{message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!signedIn && authEnabled && (
          <Link href={signInHref} className="inline-flex h-11 items-center rounded-lg bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover">
            Sign in free
          </Link>
        )}
        <Link href="/request" className="inline-flex h-11 items-center rounded-lg border border-line bg-surface px-5 font-medium hover:bg-surface-2">
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-4 print:border-0 print:px-0">
      <div>
        <p className="text-xs font-medium tracking-wide text-accent uppercase">Detailed report</p>
        <p className="font-semibold">
          {result.domain} <span className="font-normal text-muted">· {date}</span>
        </p>
        <p className="hidden text-xs text-muted print:block">
          {site.name} by {site.ownerName}
        </p>
      </div>
      <button
        onClick={() => window.print()}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover print:hidden"
      >
        <span aria-hidden>↓</span> Download PDF
      </button>
    </div>
  );
}

function UnlockBanner({ signInHref }: { signInHref: string }) {
  if (!authEnabled) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink">
        <span className="font-semibold">You&apos;re seeing a preview.</span> Sign in free for the detailed report: every issue, the full
        tech stack, how we detected it, and a PDF download, with unlimited checks.
      </p>
      <Link
        href={signInHref}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover"
      >
        Sign in free
      </Link>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</section>;
}

function Loading({ step }: { step: number }) {
  return (
    <Card>
      <ol className="space-y-3" aria-live="polite">
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center gap-3 text-sm ${i > step ? "text-muted" : "text-ink"}`}>
            <span
              aria-hidden
              className={`grid size-5 place-items-center rounded-full border text-[11px] ${
                i < step ? "border-good bg-good text-white" : i === step ? "border-accent" : "border-line"
              }`}
            >
              {i < step ? "✓" : i === step ? <span className="size-2 animate-pulse rounded-full bg-accent" /> : null}
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
  medium: "Medium confidence",
  low: "Estimate",
};

function ConfidencePill({ level }: { level: Confidence }) {
  const tone =
    level === "high" ? "bg-good-soft text-good" : level === "medium" ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-2";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{CONFIDENCE_LABEL[level]}</span>;
}

function Summary({ result }: { result: PublicResult }) {
  const r = result;
  const techTotal = r.technologies.length - 1 + r.hiddenTechCount;
  return (
    <Card>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.domain)}&sz=64`}
          alt=""
          width={32}
          height={32}
          className="mt-0.5 size-8 shrink-0 rounded-md border border-line bg-surface-2"
        />
        <div className="min-w-0">
          <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-lg font-semibold hover:underline">
            {r.domain}
          </a>
          {r.pageTitle && <p className="truncate text-sm text-muted">{r.pageTitle}</p>}
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-2">This website is built with</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <span className="text-3xl font-semibold tracking-tight sm:text-4xl">{r.platform.name}</span>
        <ConfidencePill level={r.platform.confidence} />
      </div>

      <dl className="mt-6 grid grid-cols-1 border-t border-line sm:grid-cols-2">
        <Row label="Theme">
          {r.theme ? (
            <>
              <span className="font-medium">{r.theme.name}</span>
              {r.theme.detail && <span className="block text-sm text-muted">{r.theme.detail}</span>}
            </>
          ) : (
            <span className="text-muted">Not publicly exposed</span>
          )}
        </Row>
        <Row label="Likely plan / hosting">
          {r.likelyPlan ? (
            <>
              <span className="font-medium">{r.likelyPlan.label}</span>
              <span className="ml-2 align-middle">
                <ConfidencePill level={r.likelyPlan.confidence} />
              </span>
              <span className="block text-sm text-muted">{r.likelyPlan.reason}</span>
            </>
          ) : (
            <span className="text-muted">Not determinable</span>
          )}
        </Row>
        <Row label="Apps & tools detected">
          <span className="text-2xl font-semibold">{techTotal}</span>
          <span className="ml-2 text-sm text-muted">
            {r.appsCount > 0
              ? `incl. ${r.appsCount} marketing & support app${r.appsCount === 1 ? "" : "s"}`
              : techTotal === 1
                ? "technology"
                : "technologies"}
          </span>
        </Row>
        <Row label="UX opportunities">
          <span className="text-2xl font-semibold">{r.issueSummary.total}</span>
          <span className="ml-2 text-sm text-muted">
            {r.issueSummary.high > 0
              ? `${r.issueSummary.high} high impact`
              : `quick win${r.issueSummary.total === 1 ? "" : "s"} found`}
          </span>
        </Row>
      </dl>

      {r.detailed && r.platform.evidence.length > 0 && (
        <div className="mt-4 rounded-lg bg-surface-2 p-4 text-sm text-ink-2">
          <p className="font-medium text-ink">How we detected {r.platform.name}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 break-words">
            {r.platform.evidence.map((e) => (
              <li key={e}>{e}</li>
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
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function scoreStatus(n: number) {
  if (n >= 90) return { label: "Good", tone: "text-good", dot: "bg-good" };
  if (n >= 50) return { label: "Needs work", tone: "text-warn", dot: "bg-warn" };
  return { label: "Poor", tone: "text-bad", dot: "bg-bad" };
}

function ScoresCard({ state, hasId }: { state: ScoreState; hasId: boolean }) {
  if (!hasId) return null;
  const items: [string, number | null | undefined][] = [
    ["Performance", state.data?.performance],
    ["SEO", state.data?.seo],
    ["Accessibility", state.data?.accessibility],
    ["Best practices", state.data?.bestPractices],
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Mobile scores</h2>
        <span className="text-xs text-muted">Google Lighthouse</span>
      </div>

      {state.status === "error" ? (
        <p className="mt-3 text-sm text-muted">{state.error ?? "Scores unavailable right now."}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map(([label, value]) => {
              const s = value != null ? scoreStatus(value) : null;
              return (
                <div key={label} className="rounded-lg bg-surface-2 p-4">
                  <p className="text-sm text-ink-2">{label}</p>
                  {state.status === "done" && value != null && s ? (
                    <>
                      <p className="mt-1 text-3xl font-semibold">{value}</p>
                      <p className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${s.tone}`}>
                        <span aria-hidden className={`size-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </p>
                    </>
                  ) : state.status === "done" ? (
                    <p className="mt-1 text-3xl font-semibold text-muted">–</p>
                  ) : (
                    <>
                      <div className="skeleton mt-2 h-8 w-12 rounded" />
                      <div className="skeleton mt-2 h-3 w-16 rounded" />
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
            <p className="mt-3 text-sm text-ink-2">
              Largest content loads in <strong>{state.data.lcp ?? "–"}</strong> · Layout shift{" "}
              <strong>{state.data.cls ?? "–"}</strong> · Blocking time <strong>{state.data.tbt ?? "–"}</strong>
            </p>
          )}
        </>
      )}
    </Card>
  );
}

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  high: { label: "High impact", className: "bg-bad-soft text-bad" },
  medium: { label: "Medium", className: "bg-warn-soft text-warn" },
  low: { label: "Low", className: "bg-surface-2 text-ink-2" },
};

function IssueItem({ issue }: { issue: Issue }) {
  const s = SEVERITY[issue.severity];
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
      <span className={`h-fit w-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:w-24 sm:text-center ${s.className}`}>
        {s.label}
      </span>
      <div>
        <p className="font-medium">{issue.title}</p>
        <p className="text-sm text-ink-2">{issue.detail}</p>
      </div>
    </li>
  );
}

function Opportunities({ result, signInHref }: { result: PublicResult; signInHref: string }) {
  const { issueSummary: sum } = result;

  if (sum.total === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">No quick-win issues found</h2>
        <p className="mt-1 text-ink-2">The homepage covers the basics well. An expert review can still uncover conversion and design improvements.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">
        We found {sum.total} thing{sum.total === 1 ? "" : "s"} to improve
      </h2>
      <p className="mt-1 flex flex-wrap gap-2 text-sm">
        {(["high", "medium", "low"] as const)
          .filter((k) => sum[k] > 0)
          .map((k) => (
            <span key={k} className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY[k].className}`}>
              {sum[k]} {SEVERITY[k].label.toLowerCase()}
            </span>
          ))}
      </p>

      {result.issues ? (
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
            <>
              <div aria-hidden className="pointer-events-none space-y-2 border-t border-line pt-3 select-none">
                {Array.from({ length: Math.min(sum.total - 1, 3) }).map((_, i) => (
                  <div key={i} className="flex gap-4 blur-[3px]">
                    <span className="h-5 w-24 rounded-full bg-surface-2" />
                    <span className="h-5 flex-1 rounded bg-surface-2" />
                  </div>
                ))}
              </div>
              {authEnabled && (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">See all {sum.total} issues, free</p>
                    <p className="text-sm text-ink-2">
                      Sign in with Google for the detailed report and unlimited checks.
                    </p>
                  </div>
                  <Link
                    href={signInHref}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover"
                  >
                    Sign in free
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}

function WebsiteCta({ result, onRequest }: { result: PublicResult; onRequest: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-accent/40 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 print:hidden">
      <div>
        <p className="text-xs font-medium tracking-wide text-accent uppercase">Design &amp; build by {site.ownerName}</p>
        <h2 className="mt-1 text-lg font-semibold">Want a website like {result.domain}?</h2>
        <p className="mt-1 text-sm text-ink-2">
          Get a fast, conversion-focused site on Shopify, WordPress, Webflow, Framer or custom code. Free, no-obligation quote.
        </p>
      </div>
      <button
        onClick={onRequest}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover"
      >
        Request a website
      </button>
    </section>
  );
}

function Technologies({ result, signInHref }: { result: PublicResult; signInHref: string }) {
  const groups = new Map<string, string[]>();
  for (const t of result.technologies) {
    if (t.category === "Platform") continue;
    groups.set(t.category, [...(groups.get(t.category) ?? []), t.name]);
  }
  if (groups.size === 0 && result.hiddenTechCount === 0) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold">Technology stack</h2>
      <dl className="mt-4 space-y-4">
        {[...groups].map(([category, names]) => (
          <div key={category} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm text-muted">{category}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {names.map((n) => (
                <span key={n} className="rounded-md border border-line bg-surface-2 px-2 py-1 text-sm">
                  {n}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {result.hiddenTechCount > 0 && (
        <p className="mt-4 border-t border-line pt-4 text-sm text-ink-2">
          +{result.hiddenTechCount} more technolog{result.hiddenTechCount === 1 ? "y" : "ies"} detected.{" "}
          {authEnabled && (
            <Link href={signInHref} className="font-medium text-accent hover:underline">
              Sign in free to see the full stack
            </Link>
          )}
        </p>
      )}
    </Card>
  );
}
