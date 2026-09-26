import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import Pagination from "@/components/admin/Pagination";
import { listLeads, PAGE_SIZE } from "@/lib/admin-data";
import { fmtDateTime } from "@/lib/format";
import { isEmailConfigured } from "@/lib/notify";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listLeads({ page, q: sp.q });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <a href="/api/admin/export?type=leads" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          Export CSV
        </a>
      </div>

      {!isEmailConfigured() && (
        <p className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink-2">
          <span className="font-medium text-ink">Email alerts are off.</span> Set <code>RESEND_API_KEY</code> and{" "}
          <code>LEAD_NOTIFY_EMAIL</code> to get an email for every new lead.
        </p>
      )}

      <form className="flex gap-2 text-sm" method="get">
        <label className="sr-only" htmlFor="q">
          Search leads
        </label>
        <input
          id="q"
          name="q"
          defaultValue={sp.q}
          placeholder="Search name, email or domain…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent sm:max-w-sm"
        />
        <button className="h-10 rounded-lg bg-accent px-4 font-medium text-accent-ink hover:bg-accent-hover">Search</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Website checked</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No leads yet. They appear here when visitors unlock the full audit.
                </td>
              </tr>
            )}
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 whitespace-nowrap text-ink-2">{fmtDateTime(l.created_at)}</td>
                <td className="px-4 py-3 font-medium">{l.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${l.email}`} className="text-accent hover:underline">
                    {l.email}
                  </a>
                </td>
                <td className="px-4 py-3">
                  {l.domain ? (
                    <Link href={`/admin/checks?q=${encodeURIComponent(l.domain)}`} className="hover:underline">
                      {l.domain}
                    </Link>
                  ) : (
                    "–"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={{ q: sp.q }} />
    </div>
  );
}
