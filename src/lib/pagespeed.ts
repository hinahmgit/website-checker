import "server-only";
import type { Scores } from "./types";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface LighthouseResponse {
  lighthouseResult?: {
    categories?: Record<string, { score: number | null }>;
    audits?: Record<string, { displayValue?: string }>;
  };
  error?: { message?: string };
}

/** Runs Google Lighthouse (mobile) through the PageSpeed Insights API. Takes ~10–40 s. */
export async function fetchScores(url: string): Promise<Scores> {
  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) params.append("category", c);
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);

  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(55_000), cache: "no-store" });
  const data = (await res.json()) as LighthouseResponse;
  if (!res.ok || !data.lighthouseResult) {
    throw new Error(data.error?.message ?? `PageSpeed API returned HTTP ${res.status}`);
  }
  const cat = data.lighthouseResult.categories ?? {};
  const audits = data.lighthouseResult.audits ?? {};
  const pct = (key: string) => (cat[key]?.score == null ? null : Math.round(cat[key].score! * 100));

  return {
    performance: pct("performance"),
    seo: pct("seo"),
    accessibility: pct("accessibility"),
    bestPractices: pct("best-practices"),
    lcp: audits["largest-contentful-paint"]?.displayValue ?? null,
    cls: audits["cumulative-layout-shift"]?.displayValue ?? null,
    tbt: audits["total-blocking-time"]?.displayValue ?? null,
    strategy: "mobile",
    fetchedAt: new Date().toISOString(),
  };
}
