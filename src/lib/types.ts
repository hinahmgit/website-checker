// Shapes shared by the API routes and the browser.

export type Confidence = "high" | "medium" | "low";
export type Severity = "high" | "medium" | "low";

export interface Tech {
  name: string;
  category: string;
}

export interface Issue {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface Detection {
  url: string;
  domain: string;
  pageTitle: string | null;
  platform: { name: string; confidence: Confidence; evidence: string[] };
  theme: { name: string; detail?: string } | null;
  likelyPlan: { label: string; confidence: Confidence; reason: string } | null;
  technologies: Tech[];
  appsCount: number;
  issues: Issue[];
}

/** What the public checker receives. The full issue list is only included for signed-in users. */
export interface PublicResult extends Omit<Detection, "issues"> {
  id: string | null;
  issueSummary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    teaser: Issue | null;
  };
  issues: Issue[] | null;
  scores: Scores | null;
  /** True for signed-in users: full issues, full tech stack, detection evidence, PDF download. */
  detailed: boolean;
  /** Technologies left out of a visitor's preview. */
  hiddenTechCount: number;
}

/** Today's checks. For signed-in users `limit` and `remaining` are null (unlimited). */
export interface Usage {
  signedIn: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  /** When a visitor who has used all free checks gets one back (ISO time), else null. */
  resetsAt: string | null;
}

export type RequestType = "audit" | "website";

export interface Scores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcp: string | null;
  cls: string | null;
  tbt: string | null;
  strategy: "mobile";
  fetchedAt: string;
}
