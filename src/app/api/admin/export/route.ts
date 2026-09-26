import { isAdmin } from "@/lib/auth";
import { readAll } from "@/lib/admin-data";

type Row = Record<string, unknown>;

function csvCell(value: unknown): string {
  let s = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[], columns: [string, (r: Row) => unknown][]): string {
  const header = columns.map(([h]) => csvCell(h)).join(",");
  const lines = rows.map((r) => columns.map(([, get]) => csvCell(get(r))).join(","));
  return "﻿" + [header, ...lines].join("\r\n"); // BOM so Excel opens UTF-8 correctly
}

const score = (r: Row, key: string) => (r.scores as Row | null)?.[key];

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  const type = new URL(req.url).searchParams.get("type");
  const stamp = new Date().toISOString().slice(0, 10);

  let csv: string;
  if (type === "leads") {
    const rows = await readAll<Row>("leads", "created_at, name, email, domain, website");
    csv = toCsv(rows, [
      ["Date", (r) => r.created_at],
      ["Name", (r) => r.name],
      ["Email", (r) => r.email],
      ["Domain", (r) => r.domain],
      ["Website", (r) => r.website],
    ]);
  } else if (type === "checks") {
    const rows = await readAll<Row>(
      "checks_with_flags",
      "created_at, domain, url, status, error, platform, theme, likely_plan, issues, scores, is_new_domain, domain_check_count",
    );
    csv = toCsv(rows, [
      ["Date", (r) => r.created_at],
      ["Domain", (r) => r.domain],
      ["URL", (r) => r.url],
      ["Status", (r) => r.status],
      ["Error", (r) => r.error],
      ["Platform", (r) => r.platform],
      ["Theme", (r) => r.theme],
      ["Likely plan", (r) => r.likely_plan],
      ["UX issues", (r) => (Array.isArray(r.issues) ? r.issues.length : "")],
      ["Performance", (r) => score(r, "performance")],
      ["SEO", (r) => score(r, "seo")],
      ["Accessibility", (r) => score(r, "accessibility")],
      ["First check of domain", (r) => (r.is_new_domain ? "yes" : "no")],
      ["Times domain checked", (r) => r.domain_check_count],
    ]);
  } else {
    return new Response("Unknown export type", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${type}-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
