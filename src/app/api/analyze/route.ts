import { NextResponse } from "next/server";
import { analyzeUrl } from "@/lib/detect/analyze";
import { CheckError, domainOf, normalizeInput } from "@/lib/detect/fetch";
import { clientIp, hashIp } from "@/lib/request";
import { countRecentChecks, saveCheck } from "@/lib/store";
import type { Detection, PublicResult } from "@/lib/types";

export const maxDuration = 30;

const HOURLY_LIMIT = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const raw = typeof body?.url === "string" ? body.url : "";

  let target: URL;
  try {
    target = normalizeInput(raw);
  } catch (err) {
    return NextResponse.json({ error: (err as CheckError).userMessage ?? "Invalid address." }, { status: 400 });
  }

  const ipHash = hashIp(clientIp(req));
  try {
    if ((await countRecentChecks(ipHash)) >= HOURLY_LIMIT) {
      return NextResponse.json({ error: "You've run a lot of checks — please try again in an hour." }, { status: 429 });
    }
  } catch (err) {
    console.error("rate limit lookup failed", err);
  }

  let detection: Detection;
  try {
    detection = await analyzeUrl(target);
  } catch (err) {
    const message = err instanceof CheckError ? err.userMessage : "Something went wrong while analysing that website.";
    if (!(err instanceof CheckError)) console.error("analyze failed", err);
    await saveCheck({ inputUrl: raw, url: target.toString(), domain: domainOf(target), ipHash, error: message }).catch(
      (e) => console.error("saving failed check", e),
    );
    return NextResponse.json({ error: message }, { status: 422 });
  }

  let id: string | null = null;
  try {
    id = await saveCheck({ inputUrl: raw, url: target.toString(), domain: detection.domain, ipHash, detection });
  } catch (err) {
    console.error("saving check failed", err);
  }

  const { issues, ...rest } = detection;
  const result: PublicResult = {
    ...rest,
    id,
    issueSummary: {
      total: issues.length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low").length,
      teaser: issues[0] ?? null,
    },
  };
  return NextResponse.json(result);
}
