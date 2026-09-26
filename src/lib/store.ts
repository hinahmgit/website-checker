import "server-only";
import { randomUUID } from "node:crypto";
import type { Detection, Issue, Scores } from "./types";
import { db, isDbConfigured } from "./supabase";

// Persistence for the public checker. When Supabase isn't configured (first local run),
// checks are kept in memory so the checker still works end to end — nothing is saved.

export interface StoredCheck {
  id: string;
  url: string;
  domain: string;
  platform: string | null;
  theme: string | null;
  likely_plan: string | null;
  issues: Issue[];
  scores: Scores | null;
}

const memory = ((globalThis as { __wcMemory?: Map<string, StoredCheck> }).__wcMemory ??= new Map());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function countRecentChecks(ipHash: string, minutes = 60): Promise<number> {
  if (!isDbConfigured()) return 0;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count, error } = await db()
    .from("checks")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function saveCheck(input: {
  inputUrl: string;
  domain: string;
  ipHash: string;
  detection?: Detection;
  error?: string;
  url: string;
}): Promise<string | null> {
  const d = input.detection;
  if (!isDbConfigured()) {
    if (!d) return null;
    const id = randomUUID();
    memory.set(id, {
      id,
      url: d.url,
      domain: d.domain,
      platform: d.platform.name,
      theme: d.theme?.name ?? null,
      likely_plan: d.likelyPlan?.label ?? null,
      issues: d.issues,
      scores: null,
    });
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
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getCheck(id: string): Promise<StoredCheck | null> {
  if (!isDbConfigured()) return memory.get(id) ?? null;
  const { data, error } = await db()
    .from("checks")
    .select("id, url, domain, platform, theme, likely_plan, issues, scores")
    .eq("id", id)
    .eq("status", "ok")
    .maybeSingle();
  if (error) throw error;
  return (data as StoredCheck | null) ?? null;
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

export async function saveLead(lead: { checkId: string; name: string; email: string; website: string; domain: string }) {
  if (!isDbConfigured()) return;
  const { error } = await db().from("leads").insert({
    check_id: lead.checkId,
    name: lead.name,
    email: lead.email,
    website: lead.website,
    domain: lead.domain,
  });
  if (error) throw error;
}
