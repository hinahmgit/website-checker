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
}

export interface Usage {
  signedIn: boolean;
  limit: number;
  used: number;
  remaining: number;
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
