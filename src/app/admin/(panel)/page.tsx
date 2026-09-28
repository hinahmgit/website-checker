import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { PlatformChart, TrendChart } from "@/components/admin/DashboardCharts";
import { getStats, listChecks, timeZone } from "@/lib/admin-data";
import { fmtDateTime, fmtNum, pctChange } from "@/lib/format";

export default async function Dashboard() {
  await requireAdmin();
  const [stats, recent] = await Promise.all([getStats(), listChecks({ page: 1, limit: 8 })]);
  const { checks, domains, signups, requests } = stats;
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: timeZone(), year: "numeric" }).format(new Date()));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Times shown in {timeZone()}.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href="/api/admin/export?type=checks" className="rounded-lg border border-line bg-surface px-3 py-2 hover:bg-surface-2">
            Export checks CSV
          </a>
          <a href="/api/admin/export?type=requests" className="rounded-lg border border-line bg-surface px-3 py-2 hover:bg-surface-2">
            Export leads CSV
          </a>
          <a href="/api/admin/export?type=users" className="rounded-lg border border-line bg-surface px-3 py-2 hover:bg-surface-2">
            Export users CSV
          </a>
        </div>
      </div>

      <StatGroup title="Websites checked">
        <Stat label="All time" value={checks.total} />
        <Stat label="This month" value={checks.this_month} compare={{ previous: checks.last_month, label: "last month" }} />
        <Stat label={`This year (${year})`} value={checks.this_year} note="year to date" />
        <Stat label={`Last year (${year - 1})`} value={checks.last_year} />
      </StatGroup>

      <StatGroup title="Unique websites">
        <Stat label="Unique domains" value={domains.unique_total} />
        <Stat label="New this month" value={domains.new_this_month} compare={{ previous: domains.new_last_month, label: "last month" }} />
        <Stat label={`New in ${year}`} value={domains.new_this_year} note={`${fmtNum(domains.new_last_year)} new in ${year - 1}`} />
        <Stat
          label="Repeat checks"
          value={domains.repeat_checks}
          note={checks.total ? `${Math.round((domains.repeat_checks / checks.total) * 100)}% of all checks` : undefined}
        />
      </StatGroup>

      <StatGroup title="Leads (Request a website)">
        <Stat label="Awaiting reply" value={requests.new} note={`${fmtNum(requests.open)} still open`} href="/admin/leads?status=new" />
        <Stat label="This month" value={requests.this_month} compare={{ previous: requests.last_month, label: "last month" }} />
        <Stat label={`This year (${year})`} value={requests.this_year} note={`${fmtNum(requests.last_year)} in ${year - 1}`} />
        <Stat label="All time" value={requests.total} href="/admin/leads" />
      </StatGroup>

      <StatGroup title="Sign-ups">
        <Stat label="All time" value={signups.total} href="/admin/users" />
        <Stat label="This month" value={signups.this_month} compare={{ previous: signups.last_month, label: "last month" }} />
        <Stat label={`This year (${year})`} value={signups.this_year} note={`${fmtNum(signups.last_year)} in ${year - 1}`} />
        <Stat
          label="Checks by signed-in users"
          value={checks.by_users}
          note={checks.total ? `${Math.round((checks.by_users / checks.total) * 100)}% of all checks` : undefined}
        />
      </StatGroup>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <TrendChart daily={stats.daily} monthly={stats.monthly} />
        </Panel>
        <Panel className="lg:col-span-2">
          <PlatformChart all={stats.platforms} month={stats.platforms_this_month} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-semibold">Most-checked websites</h2>
          {stats.top_domains.length === 0 ? (
            <p className="py-6 text-sm text-muted">No checks yet.</p>
          ) : (
            <table className="tabular w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Domain</th>
                  <th className="pb-2 font-medium">Platform</th>
                  <th className="pb-2 text-right font-medium">Checks</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_domains.map((d) => (
                  <tr key={d.domain} className="border-t border-line">
                    <td className="max-w-40 truncate py-2">
                      <Link href={`/admin/checks?q=${encodeURIComponent(d.domain)}`} className="hover:underline">
                        {d.domain}
                      </Link>
                    </td>
                    <td className="py-2 text-ink-2">{d.platform ?? "–"}</td>
                    <td className="py-2 text-right">{fmtNum(d.checks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest checks</h2>
            <Link href="/admin/checks" className="text-sm text-accent hover:underline">
              View all →
            </Link>
          </div>
          {recent.rows.length === 0 ? (
            <p className="py-6 text-sm text-muted">No checks yet. Try the checker!</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recent.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.domain}
                      {r.is_new_domain && <NewBadge />}
                    </p>
                    <p className="text-xs text-muted">{fmtDateTime(r.created_at)}</p>
                  </div>
                  <span className={`shrink-0 text-right ${r.status === "error" ? "text-bad" : "text-ink-2"}`}>
                    {r.status === "error" ? "Failed" : r.platform}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, display, note, compare, href }: {
  label: string;
  value?: number;
  display?: string;
  note?: string;
  compare?: { previous: number; label: string };
  href?: string;
}) {
  const change = compare && value != null ? pctChange(value, compare.previous) : null;
  const Box = href ? Link : "div";
  return (
    <Box href={href!} className={`block rounded-xl border border-line bg-surface p-4 ${href ? "hover:border-accent/50" : ""}`}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{display ?? fmtNum(value)}</p>
      {compare ? (
        <p className="mt-1 text-xs text-muted">
          {change != null && change !== 0 && (
            <span className={`mr-1 font-medium ${change > 0 ? "text-good" : "text-bad"}`}>
              {change > 0 ? "▲" : "▼"} {Math.abs(change)}%
            </span>
          )}
          {fmtNum(compare.previous)} {compare.label}
        </p>
      ) : note ? (
        <p className="mt-1 text-xs text-muted">{note}</p>
      ) : null}
    </Box>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

function NewBadge() {
  return <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 align-middle text-[10px] font-medium text-accent">NEW</span>;
}
