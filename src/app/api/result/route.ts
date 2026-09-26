import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-user";
import { getCheck, isUuid, toPublic } from "@/lib/store";

// Reopens a saved check (shareable links, and returning from sign-in) without re-analysing the site.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "Unknown check." }, { status: 400 });

  const check = await getCheck(id);
  if (!check) return NextResponse.json({ error: "That result has expired. Please run the check again." }, { status: 404 });

  const user = await currentUser();
  return NextResponse.json({ result: toPublic(check.id, check.detection, check.scores, Boolean(user)) });
}
