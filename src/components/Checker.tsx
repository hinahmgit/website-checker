"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import type { Confidence, Issue, PublicResult, Scores, Severity } from "@/lib/types";

const STEPS = [
  "Fetching the homepage",
  "Detecting the platform",
  "Identifying the theme",
  "Scanning for apps and tools",
  "Reviewing UX and SEO basics",
];

type ScoreState = { status: "idle" | "loading" | "done" | "error"; data?: Scores; error?: string };
type LeadState = { status: "idle" | "sending" | "done"; issues?: Issue[]; error?: string };

export default function Checker() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<PublicResult | null>(null);
  const [error, setError] = useState("");
  const [scores, setScores] = useState<ScoreState>({ status: "idle" });
  const [lead, setLead] = useState<LeadState>({ status: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);
  const run = useRef(0);

  async function analyze(target: string) {
    const current = ++run.current;
    setPhase("loading");
    setStep(0);
    setError("");
    setResult(null);
    setScores({ status: "idle" });
    setLead({ status: "idle" });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (current !== run.current) return;
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as PublicResult);
      setPhase("done");
      const params = new URLSearchParams({ url: (data as PublicResult).domain });
      window.history.replaceState(null, "", `?${params}`);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      if (data.id) loadScores(data.id, current);
    } catch (err) {
      if (current !== run.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

  // Support shareable links: /?url=example.com runs the check straight away.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("url");
    if (initial) {
      setUrl(initial);
      analyze(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim() && phase !== "loading") analyze(url);
  }

  return (
    <div>
      <section className={phase === "idle" || phase === "error" ? "pt-10 pb-8 sm:pt-20" : "pt-6 pb-6"}>
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

        {phase === "error" && (
          <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-ink">
            <span className="font-medium text-bad">Couldn&apos;t check that site. </span>
            {error}
          </p>
        )}
      </section>

      {phase === "loading" && <Loading step={step} />}

      {phase === "done" && result && (
        <div ref={resultRef} className="scroll-mt-4 space-y-4 pb-16">
          <Summary result={result} />
          <ScoresCard state={scores} hasId={Boolean(result.id)} />
          <Opportunities result={result} lead={lead} setLead={setLead} />
          <Technologies result={result} />
        </div>
      )}
    </div>
  );
}

// ——————————————————————————————————————————————————————————————— pieces

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
          <span className="text-2xl font-semibold">{r.technologies.length - 1}</span>
          <span className="ml-2 text-sm text-muted">
            {r.appsCount > 0
              ? `incl. ${r.appsCount} marketing & support app${r.appsCount === 1 ? "" : "s"}`
              : r.technologies.length - 1 === 1
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

      <details className="mt-4 text-sm text-ink-2">
        <summary className="cursor-pointer text-muted hover:text-ink">How we detected this</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 break-words">
          {r.platform.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </details>
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

function Opportunities({
  result,
  lead,
  setLead,
}: {
  result: PublicResult;
  lead: LeadState;
  setLead: (s: LeadState) => void;
}) {
  const { issueSummary: sum } = result;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLead({ status: "sending" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checkId: result.id,
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLead({ status: "done", issues: data.issues });
    } catch (err) {
      setLead({ status: "idle", error: err instanceof Error ? err.message : "Please try again." });
    }
  }

  if (sum.total === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">No quick-win issues found</h2>
        <p className="mt-1 text-ink-2">The homepage covers the basics well. A deeper review can still uncover conversion and design improvements.</p>
        <BookingLink />
      </Card>
    );
  }

  return (
    <Card className="border-accent/40">
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

      {lead.status === "done" && lead.issues ? (
        <>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {lead.issues.map((i) => (
              <IssueItem key={i.id} issue={i} />
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-accent-soft p-4">
            <p className="font-medium">Thanks, here&apos;s your full list.</p>
            <p className="mt-1 text-sm text-ink-2">
              {site.ownerName} will follow up by email with a personal review of {result.domain}.
            </p>
            <BookingLink />
          </div>
        </>
      ) : (
        <>
          {sum.teaser && (
            <ul className="mt-4 border-t border-line">
              <IssueItem issue={sum.teaser} />
            </ul>
          )}
          {sum.total > 1 && (
            <div aria-hidden className="pointer-events-none space-y-2 border-t border-line pt-3 select-none">
              {Array.from({ length: Math.min(sum.total - 1, 3) }).map((_, i) => (
                <div key={i} className="flex gap-4 blur-[3px]">
                  <span className="h-5 w-24 rounded-full bg-surface-2" />
                  <span className="h-5 flex-1 rounded bg-surface-2" />
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
            <p className="font-medium">Get the full website audit</p>
            <p className="mt-0.5 text-sm text-ink-2">
              {sum.total > 1
                ? `See all ${sum.total} issues now, plus a personal follow-up with what to fix first.`
                : "Get a personal follow-up on design, UX and conversion improvements for this site."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="sr-only" htmlFor="lead-name">
                Your name
              </label>
              <input
                id="lead-name"
                name="name"
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Your name"
                className="h-11 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              <label className="sr-only" htmlFor="lead-email">
                Email
              </label>
              <input
                id="lead-email"
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                placeholder="you@company.com"
                className="h-11 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              {/* honeypot for bots */}
              <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <button
                type="submit"
                disabled={lead.status === "sending" || !result.id}
                className="h-11 rounded-lg bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
              >
                {lead.status === "sending" ? "Sending…" : sum.total > 1 ? "Unlock audit" : "Get my audit"}
              </button>
            </div>
            {lead.error && (
              <p role="alert" className="mt-2 text-sm text-bad">
                {lead.error}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">No spam. Your email is only used to send your audit.</p>
          </form>
        </>
      )}
    </Card>
  );
}

function BookingLink() {
  if (!site.bookingUrl) return null;
  return (
    <a
      href={site.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover"
    >
      Book a free call →
    </a>
  );
}

function Technologies({ result }: { result: PublicResult }) {
  const groups = new Map<string, string[]>();
  for (const t of result.technologies) {
    if (t.category === "Platform") continue;
    groups.set(t.category, [...(groups.get(t.category) ?? []), t.name]);
  }
  if (groups.size === 0) return null;
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
    </Card>
  );
}
