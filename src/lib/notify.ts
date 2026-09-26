import "server-only";
import { site } from "@/config/site";
import type { StoredCheck } from "./store";

// Emails you when someone unlocks the audit, via Resend's HTTP API (https://resend.com).
// Needs RESEND_API_KEY and LEAD_NOTIFY_EMAIL; silently does nothing if either is missing.

interface Lead {
  name: string;
  email: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.LEAD_NOTIFY_EMAIL);
}

export async function notifyNewLead(lead: Lead, check: StoredCheck, adminUrl: string): Promise<void> {
  if (!isEmailConfigured()) return;

  const to = process.env.LEAD_NOTIFY_EMAIL!.split(",").map((s) => s.trim()).filter(Boolean);
  // onboarding@resend.dev works without verifying a domain, but only delivers to your own Resend account email.
  const from = process.env.LEAD_FROM_EMAIL || `${site.name} <onboarding@resend.dev>`;

  const high = check.issues.filter((i) => i.severity === "high").length;
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Website", check.url],
    ["Platform", check.platform ?? "–"],
    ["Theme", check.theme ?? "–"],
    ["Likely plan", check.likely_plan ?? "–"],
    ["Issues found", `${check.issues.length}${high ? ` (${high} high impact)` : ""}`],
  ];

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;color:#0b0b0b">
  <h2 style="margin:0 0 4px;font-size:20px">New lead: ${esc(lead.name)}</h2>
  <p style="margin:0 0 20px;color:#52514e">They unlocked the audit for <strong>${esc(check.domain)}</strong>. Reply to this email to contact them directly.</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #e4e3dd;color:#7a7873;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e4e3dd">${esc(v)}</td></tr>`,
      )
      .join("")}
  </table>
  ${
    check.issues.length
      ? `<h3 style="margin:24px 0 8px;font-size:15px">What they saw</h3>
  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6">
    ${check.issues.map((i) => `<li><strong>${esc(i.title)}</strong> <span style="color:#7a7873">(${i.severity})</span></li>`).join("")}
  </ul>`
      : ""
  }
  <p style="margin:24px 0 0"><a href="${esc(adminUrl)}" style="color:#2a63d6">Open the leads dashboard →</a></p>
</div>`;

  const text = [
    `New lead: ${lead.name}`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    ...check.issues.map((i) => `- ${i.title} (${i.severity})`),
    "",
    `Leads dashboard: ${adminUrl}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: lead.email,
      subject: `New lead from ${check.domain}: ${lead.name}`,
      html,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Resend returned HTTP ${res.status}: ${await res.text()}`);
  }
}
