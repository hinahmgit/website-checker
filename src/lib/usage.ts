import "server-only";
import { site } from "@/config/site";
import type { Usage } from "./types";

/**
 * Visitors: a limit per rolling 24 hours. Signed-in users: unlimited, with a hidden fair-use cap against bots.
 * `oldest` is the earliest counted check in the window; the limit frees up 24 hours after it.
 */
export function usageFor(signedIn: boolean, used: number, oldest: string | null = null): Usage & { blocked: boolean } {
  const resetsAt = oldest ? new Date(Date.parse(oldest) + 24 * 60 * 60_000).toISOString() : null;
  if (signedIn) {
    return { signedIn, limit: null, used, remaining: null, resetsAt: null, blocked: used >= site.limits.accountFairUse };
  }
  const limit = site.limits.visitor;
  const remaining = Math.max(0, limit - used);
  return { signedIn, limit, used, remaining, resetsAt: remaining === 0 ? resetsAt : null, blocked: used >= limit };
}

/** "5h 20m", "45m" — time until the given moment. */
export function waitText(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}
