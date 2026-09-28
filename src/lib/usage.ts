import "server-only";
import { site } from "@/config/site";
import type { Usage } from "./types";

/** Visitors: a daily limit. Signed-in users: unlimited, with a hidden fair-use cap against bots. */
export function usageFor(signedIn: boolean, used: number): Usage & { blocked: boolean } {
  if (signedIn) {
    return { signedIn, limit: null, used, remaining: null, blocked: used >= site.limits.accountFairUse };
  }
  const limit = site.limits.visitor;
  return { signedIn, limit, used, remaining: Math.max(0, limit - used), blocked: used >= limit };
}
