import "server-only";
import { db } from "./supabase";
import type { Issue, Scores } from "./types";

export interface Point {
  date: string;
  count: number;
}

interface PeriodCounts {
  total: number;
  this_month: number;
  last_month: number;
  this_year: number;
  last_year: number;
}

export interface Stats {
  checks: PeriodCounts & { errors: number; by_users: number };
  domains: {
    unique_total: number;
    new_this_month: number;
    new_last_month: number;
    new_this_year: number;
    new_last_year: number;
    repeat_checks: number;
  };
  signups: PeriodCounts;
  requests: PeriodCounts & { audit: number; website: number; open: number; new: number };
  platforms: { platform: string; count: number }[];
  platforms_this_month: { platform: string; count: number }[];
  daily: Point[];
  monthly: Point[];
  top_domains: { domain: string; checks: number; last_checked: string; platform: string | null }[];
}

export const timeZone = () => process.env.ADMIN_TIMEZONE || "UTC";

export async function getStats(): Promise<Stats> {
  const { data, error } = await db().rpc("admin_stats", { tz: timeZone() });
  if (error) throw new Error(`admin_stats failed: ${error.message}. Did you run supabase/schema.sql?`);
  return data as Stats;
}

export const PAGE_SIZE = 50;

export interface CheckRow {
  id: string;
  created_at: string;
  domain: string;
  url: string;
  status: "ok" | "error";
  error: string | null;
  platform: string | null;
  theme: string | null;
  likely_plan: string | null;
  issues: Issue[];
  scores: Scores | null;
  is_new_domain: boolean;
  domain_check_count: number;
}

export type CheckFilter = "all" | "new" | "repeat" | "errors";

/** Keeps search text safe to embed in PostgREST filter strings. */
export function cleanSearch(q: string | undefined): string {
  return (q ?? "").replace(/[^\p{L}\p{N}@._\- ]/gu, "").trim().slice(0, 100);
}

export async function listChecks(opts: { page: number; q?: string; platform?: string; filter?: CheckFilter; limit?: number }) {
  const size = opts.limit ?? PAGE_SIZE;
  const from = (opts.page - 1) * size;
  let query = db()
    .from("checks_with_flags")
    .select(
      "id, created_at, domain, url, status, error, platform, theme, likely_plan, issues, scores, is_new_domain, domain_check_count",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + size - 1);

  const q = cleanSearch(opts.q);
  if (q) query = query.ilike("domain", `%${q}%`);
  if (opts.platform) query = query.eq("platform", opts.platform);
  if (opts.filter === "new") query = query.eq("is_new_domain", true);
  if (opts.filter === "repeat") query = query.eq("is_new_domain", false);
  if (opts.filter === "errors") query = query.eq("status", "error");

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as CheckRow[], total: count ?? 0 };
}


export interface UserRow {
  id: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  checks_count: number;
  last_check_at: string | null;
  requests_count: number;
}

export async function listUsers(opts: { page: number; q?: string }) {
  const from = (opts.page - 1) * PAGE_SIZE;
  let query = db()
    .from("profiles_with_usage")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const q = cleanSearch(opts.q);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as UserRow[], total: count ?? 0 };
}

export const REQUEST_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface RequestRow {
  id: string;
  created_at: string;
  type: "audit" | "website";
  status: RequestStatus;
  name: string;
  email: string;
  website: string | null;
  project_type: string | null;
  budget: string | null;
  message: string | null;
  user_id: string | null;
  /** The checked site the lead wants "a website like". */
  checks: { domain: string } | null;
}

export async function listRequests(opts: { page: number; q?: string; type?: string; status?: string }) {
  const from = (opts.page - 1) * PAGE_SIZE;
  let query = db()
    .from("requests")
    .select("id, created_at, type, status, name, email, website, project_type, budget, message, user_id, checks(domain)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const q = cleanSearch(opts.q);
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%,website.ilike.%${q}%`);
  if (opts.type === "audit" || opts.type === "website") query = query.eq("type", opts.type);
  if (REQUEST_STATUSES.includes(opts.status as RequestStatus)) query = query.eq("status", opts.status!);
  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as RequestRow[] /* checks(domain) is many-to-one: an object at runtime */, total: count ?? 0 };
}

export async function setRequestStatus(id: string, status: RequestStatus): Promise<void> {
  const { error } = await db().from("requests").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Reads a whole table or view in batches of 1000 (for CSV export). */
export async function readAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from(table)
      .select(columns)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}
