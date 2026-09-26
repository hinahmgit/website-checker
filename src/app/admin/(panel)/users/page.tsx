import Pagination from "@/components/admin/Pagination";
import { listUsers, PAGE_SIZE } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listUsers({ page, q: sp.q });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <a href="/api/admin/export?type=users" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          Export CSV
        </a>
      </div>

      <form className="flex gap-2 text-sm" method="get">
        <label className="sr-only" htmlFor="q">
          Search users
        </label>
        <input
          id="q"
          name="q"
          defaultValue={sp.q}
          placeholder="Search name or email…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent sm:max-w-sm"
        />
        <button className="h-10 rounded-lg bg-accent px-4 font-medium text-accent-ink hover:bg-accent-hover">Search</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="tabular w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Via</th>
              <th className="px-4 py-3 text-right font-medium">Checks</th>
              <th className="px-4 py-3 font-medium">Last check</th>
              <th className="px-4 py-3 text-right font-medium">Requests</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No users yet. They appear here when visitors sign in.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 whitespace-nowrap text-ink-2">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3 font-medium">{u.full_name ?? "–"}</td>
                <td className="px-4 py-3">
                  {u.email ? (
                    <a href={`mailto:${u.email}`} className="text-accent hover:underline">
                      {u.email}
                    </a>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="px-4 py-3 text-ink-2 capitalize">{u.provider ?? "–"}</td>
                <td className="px-4 py-3 text-right">{u.checks_count}</td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-2">{u.last_check_at ? fmtDateTime(u.last_check_at) : "–"}</td>
                <td className="px-4 py-3 text-right">{u.requests_count || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={{ q: sp.q }} />
    </div>
  );
}
