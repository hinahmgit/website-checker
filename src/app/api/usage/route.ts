import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-user";
import { clientIp, deviceHash, hashIp } from "@/lib/request";
import { countChecksToday } from "@/lib/store";
import { usageFor } from "@/lib/usage";

export async function GET(req: Request) {
  const user = await currentUser();
  const device = user ? null : await deviceHash();
  const { count, oldest } = await countChecksToday({ userId: user?.id ?? null, ipHash: hashIp(clientIp(req)), deviceHash: device }).catch(
    () => ({ count: 0, oldest: null }),
  );
  const { blocked: _, ...usage } = usageFor(Boolean(user), count, oldest);
  return NextResponse.json(
    { usage, user: user ? { email: user.email, name: user.name } : null },
    { headers: { "cache-control": "no-store" } },
  );
}
