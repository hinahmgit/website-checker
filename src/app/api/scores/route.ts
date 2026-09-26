import { NextResponse } from "next/server";
import { fetchScores } from "@/lib/pagespeed";
import { getCheck, isUuid, saveScores } from "@/lib/store";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (!isUuid(body?.id)) return NextResponse.json({ error: "Unknown check." }, { status: 400 });

  const check = await getCheck(body.id);
  if (!check) return NextResponse.json({ error: "Unknown check." }, { status: 404 });
  if (check.scores) return NextResponse.json(check.scores);

  try {
    const scores = await fetchScores(check.url);
    await saveScores(check.id, scores).catch((e) => console.error("saving scores failed", e));
    return NextResponse.json(scores);
  } catch (err) {
    console.error("pagespeed failed", err);
    return NextResponse.json({ error: "Google couldn't score this page right now." }, { status: 502 });
  }
}
