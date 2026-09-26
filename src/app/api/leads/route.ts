import { after, NextResponse } from "next/server";
import { notifyNewLead } from "@/lib/notify";
import { getCheck, isUuid, saveLead } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.replace(/[\u0000-\u001f\u007f]+/g, " ").trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  // Honeypot: real visitors never see or fill the "company" field.
  if (typeof body?.company === "string" && body.company.trim()) {
    return NextResponse.json({ issues: [] });
  }
  if (!isUuid(body?.checkId)) return NextResponse.json({ error: "Please run a check first." }, { status: 400 });
  if (!name || name.length > 100) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const check = await getCheck(body.checkId);
  if (!check) return NextResponse.json({ error: "That check has expired — please run it again." }, { status: 404 });

  try {
    await saveLead({ checkId: check.id, name, email, website: check.url, domain: check.domain });
  } catch (err) {
    console.error("saving lead failed", err);
    return NextResponse.json({ error: "Couldn't save your details. Please try again." }, { status: 500 });
  }

  // Send the notification after responding, so the visitor isn't kept waiting on the email API.
  const adminUrl = new URL("/admin/leads", req.url).toString();
  after(() => notifyNewLead({ name, email }, check, adminUrl).catch((err) => console.error("lead email failed", err)));

  return NextResponse.json({ issues: check.issues });
}
