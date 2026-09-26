import { after, NextResponse } from "next/server";
import { BUDGETS, PROJECT_TYPES } from "@/config/site";
import { currentUser } from "@/lib/auth-user";
import { notifyNewRequest } from "@/lib/notify";
import { countRecentRequests, getCheck, isUuid, saveRequest, type NewRequest } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, " ").trim().slice(0, max) || null : null;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Honeypot: real visitors never see or fill the "company" field.
  if (typeof body.company === "string" && body.company.trim()) return NextResponse.json({ ok: true });

  const type = body.type === "audit" || body.type === "website" ? body.type : null;
  const name = clean(body.name, 100)?.replace(/\s+/g, " ") ?? null;
  const email = clean(body.email, 200)?.toLowerCase() ?? null;
  const projectType = clean(body.projectType, 60);
  const budget = clean(body.budget, 60);

  if (!type) return NextResponse.json({ error: "Unknown request type." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!email || !EMAIL.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (projectType && !PROJECT_TYPES.includes(projectType)) return NextResponse.json({ error: "Please pick a project type." }, { status: 400 });
  if (budget && !BUDGETS.includes(budget)) return NextResponse.json({ error: "Please pick a budget." }, { status: 400 });

  let website = clean(body.website, 300);
  const checkId = isUuid(body.checkId) ? body.checkId : null;
  if (checkId && !website) website = (await getCheck(checkId).catch(() => null))?.detection.url ?? null;
  if (type === "audit" && !website) {
    return NextResponse.json({ error: "Please enter the website you'd like audited." }, { status: 400 });
  }

  try {
    if ((await countRecentRequests(email)) >= 5) {
      return NextResponse.json({ error: "We've already received several requests from you. We'll be in touch soon!" }, { status: 429 });
    }
  } catch (err) {
    console.error("request rate check failed", err);
  }

  const user = await currentUser();
  const request: NewRequest = {
    type,
    name,
    email,
    website,
    projectType: type === "website" ? projectType : null,
    budget,
    message: clean(body.message, 3000),
    userId: user?.id ?? null,
    checkId,
  };

  try {
    await saveRequest(request);
  } catch (err) {
    console.error("saving request failed", err);
    return NextResponse.json({ error: "Couldn't send your request. Please try again." }, { status: 500 });
  }

  const adminUrl = new URL("/admin/requests", req.url).toString();
  after(() => notifyNewRequest(request, adminUrl).catch((err) => console.error("request email failed", err)));

  return NextResponse.json({ ok: true });
}
