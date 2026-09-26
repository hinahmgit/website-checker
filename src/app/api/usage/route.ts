import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";
import { clientIp, hashIp } from "@/lib/request";
import { countChecksToday } from "@/lib/store";
import type { Usage } from "@/lib/types";

export async function GET(req: Request) {
  const user = await currentUser();
  const limit = user ? site.limits.account : site.limits.visitor;
  const used = await countChecksToday({ userId: user?.id ?? null, ipHash: hashIp(clientIp(req)) }).catch(() => 0);
  const usage: Usage = { signedIn: Boolean(user), limit, used, remaining: Math.max(0, limit - used) };
  return NextResponse.json({
    usage,
    user: user ? { email: user.email, name: user.name } : null,
  });
}
