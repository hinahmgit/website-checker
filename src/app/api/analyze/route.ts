import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";
import { analyzeUrl } from "@/lib/detect/analyze";
import { CheckError, domainOf, normalizeInput } from "@/lib/detect/fetch";
import { clientIp, deviceHash, hashIp } from "@/lib/request";
import { countChecksToday, saveCheck, toPublic } from "@/lib/store";
import type { Detection } from "@/lib/types";
import { usageFor, waitText } from "@/lib/usage";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const raw = typeof body?.url === "string" ? body.url : "";

  let target: URL;
  try {
    target = normalizeInput(raw);
  } catch (err) {
    return NextResponse.json({ error: (err as CheckError).userMessage ?? "Invalid address." }, { status: 400 });
  }

  const user = await currentUser();
  const ipHash = hashIp(clientIp(req));
  const device = user ? null : await deviceHash();
  let used = 0;
  let oldest: string | null = null;
  try {
    ({ count: used, oldest } = await countChecksToday({ userId: user?.id ?? null, ipHash, deviceHash: device }));
  } catch (err) {
    console.error("usage lookup failed", err);
  }
  const { blocked, ...usage } = usageFor(Boolean(user), used, oldest);
  if (blocked) {
    return NextResponse.json(
      {
        error: user
          ? "You've run a very large number of checks today. Please try again tomorrow."
          : `You've used your ${site.limits.visitor} free checks. You can check another site in ${waitText(usage.resetsAt) ?? "24 hours"}, or sign up free for unlimited checks right now.`,
        code: user ? "limit_account" : "limit_visitor",
        usage,
      },
      { status: 429 },
    );
  }

  let detection: Detection;
  try {
    detection = await analyzeUrl(target);
  } catch (err) {
    const message = err instanceof CheckError ? err.userMessage : "Something went wrong while analysing that website.";
    if (!(err instanceof CheckError)) console.error("analyze failed", err);
    await saveCheck({
      inputUrl: raw,
      url: target.toString(),
      domain: domainOf(target),
      ipHash,
      deviceHash: device,
      userId: user?.id ?? null,
      error: message,
    }).catch((e) => console.error("saving failed check", e));
    return NextResponse.json({ error: message }, { status: 422 });
  }

  let id: string | null = null;
  try {
    id = await saveCheck({
      inputUrl: raw,
      url: target.toString(),
      domain: detection.domain,
      ipHash,
      deviceHash: device,
      userId: user?.id ?? null,
      detection,
    });
  } catch (err) {
    console.error("saving check failed", err);
  }

  // This check now counts too; the window starts at the oldest check (or now, if this is the first).
  const { blocked: _, ...after } = usageFor(Boolean(user), used + 1, oldest ?? new Date().toISOString());
  return NextResponse.json({ result: toPublic(id, detection, null, Boolean(user)), usage: after });
}
