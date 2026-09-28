import "server-only";
import { site } from "@/config/site";
import type { NewRequest } from "./store";

// Emails you about every new lead ("Request a website" form), via Resend (https://resend.com).
// Needs RESEND_API_KEY and LEAD_NOTIFY_EMAIL; silently does nothing if either is missing.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.LEAD_NOTIFY_EMAIL);
}

const LABEL = { audit: "New lead: full report", website: "New lead: website request" } as const;

export async function notifyNewRequest(r: NewRequest, adminUrl: string, inspiredBy?: string): Promise<void> {
  if (!isEmailConfigured()) return;

  const to = process.env.LEAD_NOTIFY_EMAIL!.split(",").map((s) => s.trim()).filter(Boolean);
  // onboarding@resend.dev works without verifying a domain, but only delivers to your own Resend account email.
  const from = process.env.LEAD_FROM_EMAIL || `${site.name} <onboarding@resend.dev>`;

  const rows: [string, string | null][] = [
    ["Name", r.name],
    ["Email", r.email],
    ["Wants a site like", inspiredBy ?? null],
    ["Current website", r.website],
    ["Project type", r.projectType],
    ["Budget", r.budget],
    ["Account", r.userId ? "Signed-in user" : "Not signed in"],
  ];
  const shown = rows.filter((row): row is [string, string] => Boolean(row[1]));

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;color:#0b0b0b">
  <p style="margin:0 0 4px;font-size:13px;color:#7a7873;text-transform:uppercase;letter-spacing:.04em">${LABEL[r.type]}</p>
  <h2 style="margin:0 0 16px;font-size:20px">${esc(r.name)}</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${shown
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #e4e3dd;color:#7a7873;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e4e3dd">${esc(v)}</td></tr>`,
      )
      .join("")}
  </table>
  ${r.message ? `<h3 style="margin:20px 0 6px;font-size:15px">Message</h3><p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(r.message)}</p>` : ""}
  <p style="margin:24px 0 0;font-size:14px">Reply to this email to answer ${esc(r.name)} directly. <a href="${esc(adminUrl)}" style="color:#2a63d6">Open leads →</a></p>
</div>`;

  const text = [
    `${LABEL[r.type]}: ${r.name}`,
    ...shown.map(([k, v]) => `${k}: ${v}`),
    ...(r.message ? ["", r.message] : []),
    "",
    `Leads: ${adminUrl}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      reply_to: r.email,
      subject: `${LABEL[r.type]} from ${r.name}${inspiredBy ? ` (wants a site like ${inspiredBy})` : ""}`,
      html,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend returned HTTP ${res.status}: ${await res.text()}`);
}
