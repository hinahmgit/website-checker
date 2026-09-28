import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-user";
import { clientIp, hashIp } from "@/lib/request";
import { countChecksToday } from "@/lib/store";
import { usageFor } from "@/lib/usage";

export async function GET(req: Request) {
  const user = await currentUser();
  const used = await countChecksToday({ userId: user?.id ?? null, ipHash: hashIp(clientIp(req)) }).catch(() => 0);
  const { blocked: _, ...usage } = usageFor(Boolean(user), used);
  return NextResponse.json({
    usage,
    user: user ? { email: user.email, name: user.name } : null,
  });
}
