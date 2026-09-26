import { requireAdmin } from "@/lib/auth";
import Pagination from "@/components/admin/Pagination";
import { getStats, listChecks, PAGE_SIZE, type CheckFilter } from "@/lib/admin-data";
import { fmtDateTime } from "@/lib/format";

const FILTERS: { value: CheckFilter; label: string }[] = [
  { value: "all", label: "All checks" },
  { value: "new", label: "First-time domains" },
  { value: "repeat", label: "Repeat checks" },
  { value: "errors", label: "Failed" },
];

export default async function ChecksPage({ searchParams }: {
  searchParams: Promise<{ q?: string; platform?: string; filter?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? "all") as CheckFilter;
  const [{ rows, total }, stats] = await Promise.all([
    listChecks({ page, q: sp.q, platform: sp.platform, filter }),
    getStats(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Checked sites</h1>
        <a href="/api/admin/export?type=checks" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          Export CSV
        </a>
      </div>

      <form className="flex flex-wrap gap-2 text-sm" method="get">
        <label className="sr-only" htmlFor="q">
          Search domain
        </label>
        <input
          id="q"
          name="q"
          defaultValue={sp.q}
          placeholder="Search domain…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent sm:max-w-xs"
        />
        <label className="sr-only" htmlFor="platform">
          Platform
        </label>
        <select id="platform" name="platform" defaultValue={sp.platform ?? ""} className="h-10 rounded-lg border border-line bg-surface px-2">
          <option value="">All platforms</option>
          {stats.platforms
            .filter((p) => p.platform !== "Unknown")
            .map((p) => (
              <option key={p.platform} value={p.platform}>
                {p.platform} ({p.count})
              </option>
            ))}
        </select>
        <label className="sr-only" htmlFor="filter">
          Type
        </label>
        <select id="filter" name="filter" defaultValue={filter} className="h-10 rounded-lg border border-line bg-surface px-2">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-lg bg-accent px-4 font-medium text-accent-ink hover:bg-accent-hover">Apply</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="tabular w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Theme</th>
              <th className="px-4 py-3 font-medium">Likely plan</th>
              <th className="px-4 py-3 text-right font-medium">Issues</th>
              <th className="px-4 py-3 text-right font-medium">Perf.</th>
              <th className="px-4 py-3 text-right font-medium">SEO</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  No checks match.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 whitespace-nowrap text-ink-2">{fmtDateTime(r.created_at)}</td>
                <td className="max-w-56 px-4 py-3">
                  <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate font-medium hover:underline">
                    {r.domain}
                  </a>
                  <span className="text-xs text-muted">
                    {r.is_new_domain ? (
                      <span className="font-medium text-accent">First check</span>
                    ) : (
                      `Checked ${r.domain_check_count}× total`
                    )}
                  </span>
                </td>
                {r.status === "error" ? (
                  <td colSpan={6} className="px-4 py-3 text-bad">
                    Failed: {r.error}
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3">{r.platform}</td>
                    <td className="max-w-40 truncate px-4 py-3 text-ink-2">{r.theme ?? "–"}</td>
                    <td className="max-w-44 truncate px-4 py-3 text-ink-2">{r.likely_plan ?? "–"}</td>
                    <td className="px-4 py-3 text-right">{Array.isArray(r.issues) ? r.issues.length : "–"}</td>
                    <td className="px-4 py-3 text-right">{r.scores?.performance ?? "–"}</td>
                    <td className="px-4 py-3 text-right">{r.scores?.seo ?? "–"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={{ q: sp.q, platform: sp.platform, filter: filter === "all" ? undefined : filter }} />
    </div>
  );
}
