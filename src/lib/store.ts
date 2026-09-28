import "server-only";
import { randomUUID } from "node:crypto";
import type { Detection, Issue, PublicResult, RequestType, Scores } from "./types";
import { db, isDbConfigured } from "./supabase";

// Persistence for the public checker. When Supabase isn't configured (first local run),
// checks are kept in memory so the checker still works end to end — nothing is saved.

interface MemoryCheck {
  id: string;
  detection: Detection;
  scores: Scores | null;
}

const memory = ((globalThis as { __wcMemory?: Map<string, MemoryCheck> }).__wcMemory ??= new Map());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Checks in the last 24 hours, counted per account when signed in, otherwise per (hashed) IP. */
export async function countChecksToday(who: { userId: string | null; ipHash: string }): Promise<number> {
  if (!isDbConfigured()) return 0;
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  let query = db().from("checks").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "ok");
  query = who.userId ? query.eq("user_id", who.userId) : query.eq("ip_hash", who.ipHash).is("user_id", null);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function saveCheck(input: {
  inputUrl: string;
  domain: string;
  ipHash: string;
  userId: string | null;
  detection?: Detection;
  error?: string;
  url: string;
}): Promise<string | null> {
  const d = input.detection;
  if (!isDbConfigured()) {
    if (!d) return null;
    const id = randomUUID();
    memory.set(id, { id, detection: d, scores: null });
    return id;
  }

  const { data, error } = await db()
    .from("checks")
    .insert({
      input_url: input.inputUrl.slice(0, 2048),
      url: (d?.url ?? input.url).slice(0, 2048),
      domain: d?.domain ?? input.domain,
      status: d ? "ok" : "error",
      error: input.error ?? null,
      platform: d?.platform.name ?? null,
      theme: d?.theme?.name ?? null,
      likely_plan: d?.likelyPlan?.label ?? null,
      technologies: d?.technologies ?? [],
      issues: d?.issues ?? [],
      details: d
        ? {
            pageTitle: d.pageTitle,
            platformConfidence: d.platform.confidence,
            evidence: d.platform.evidence,
            themeDetail: d.theme?.detail ?? null,
            planConfidence: d.likelyPlan?.confidence ?? null,
            planReason: d.likelyPlan?.reason ?? null,
            appsCount: d.appsCount,
          }
        : null,
      ip_hash: input.ipHash,
      user_id: input.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

interface CheckRow {
  id: string;
  url: string;
  domain: string;
  platform: string | null;
  theme: string | null;
  likely_plan: string | null;
  technologies: Detection["technologies"];
  issues: Issue[];
  scores: Scores | null;
  details: {
    pageTitle: string | null;
    platformConfidence: Detection["platform"]["confidence"];
    evidence: string[];
    themeDetail: string | null;
    planConfidence: NonNullable<Detection["likelyPlan"]>["confidence"] | null;
    planReason: string | null;
    appsCount: number;
  } | null;
}

/** Loads a finished check. */
export async function getCheck(id: string): Promise<{ id: string; detection: Detection; scores: Scores | null } | null> {
  if (!isDbConfigured()) return memory.get(id) ?? null;
  const { data, error } = await db()
    .from("checks")
    .select("id, url, domain, platform, theme, likely_plan, technologies, issues, scores, details")
    .eq("id", id)
    .eq("status", "ok")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as CheckRow;
  const d = r.details;
  return {
    id: r.id,
    scores: r.scores,
    detection: {
      url: r.url,
      domain: r.domain,
      pageTitle: d?.pageTitle ?? null,
      platform: { name: r.platform ?? "Unknown", confidence: d?.platformConfidence ?? "low", evidence: d?.evidence ?? [] },
      theme: r.theme ? { name: r.theme, detail: d?.themeDetail ?? undefined } : null,
      likelyPlan: r.likely_plan
        ? { label: r.likely_plan, confidence: d?.planConfidence ?? "low", reason: d?.planReason ?? "" }
        : null,
      technologies: r.technologies ?? [],
      appsCount: d?.appsCount ?? 0,
      issues: r.issues ?? [],
    },
  };
}

/** How many technologies (besides the platform) a visitor sees before signing in. */
const PREVIEW_TECH = 5;

/** Shapes a check for the browser. Signed-in users get the full report; visitors get a preview. */
export function toPublic(id: string | null, d: Detection, scores: Scores | null, signedIn: boolean): PublicResult {
  const { issues, technologies, platform, ...rest } = d;
  const shownTech = signedIn ? technologies : technologies.slice(0, PREVIEW_TECH + 1); // +1: the platform itself
  return {
    ...rest,
    platform: signedIn ? platform : { ...platform, evidence: [] },
    technologies: shownTech,
    id,
    scores,
    detailed: signedIn,
    hiddenTechCount: technologies.length - shownTech.length,
    issues: signedIn ? issues : null,
    issueSummary: {
      total: issues.length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low").length,
      teaser: issues[0] ?? null,
    },
  };
}

export async function saveScores(id: string, scores: Scores): Promise<void> {
  if (!isDbConfigured()) {
    const row = memory.get(id);
    if (row) row.scores = scores;
    return;
  }
  const { error } = await db().from("checks").update({ scores }).eq("id", id);
  if (error) throw error;
}

export interface NewRequest {
  type: RequestType;
  name: string;
  email: string;
  website: string | null;
  projectType: string | null;
  budget: string | null;
  message: string | null;
  userId: string | null;
  checkId: string | null;
}

export async function saveRequest(r: NewRequest): Promise<void> {
  if (!isDbConfigured()) return;
  const { error } = await db().from("requests").insert({
    type: r.type,
    name: r.name,
    email: r.email,
    website: r.website,
    project_type: r.projectType,
    budget: r.budget,
    message: r.message,
    user_id: r.userId,
    check_id: r.checkId,
  });
  if (error) throw error;
}

/** Requests from the same address in the last hour (simple spam guard). */
export async function countRecentRequests(email: string): Promise<number> {
  if (!isDbConfigured()) return 0;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count, error } = await db()
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}
