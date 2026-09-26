import { revalidatePath } from "next/cache";
import Pagination from "@/components/admin/Pagination";
import { listRequests, PAGE_SIZE, REQUEST_STATUSES, setRequestStatus, type RequestStatus } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { isEmailConfigured } from "@/lib/notify";
import { isUuid } from "@/lib/store";

const STATUS_STYLE: Record<RequestStatus, string> = {
  new: "bg-accent-soft text-accent",
  contacted: "bg-warn-soft text-warn",
  won: "bg-good-soft text-good",
  lost: "bg-surface-2 text-muted",
};

const TYPE_LABEL = { audit: "Full report", website: "New website" };

async function updateStatus(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = formData.get("id");
  const status = formData.get("status") as RequestStatus;
  if (!isUuid(id) || !REQUEST_STATUSES.includes(status)) return;
  await setRequestStatus(id, status);
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listRequests({ page, q: sp.q, type: sp.type, status: sp.status });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
        <a href="/api/admin/export?type=requests" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2">
          Export CSV
        </a>
      </div>

      {!isEmailConfigured() && (
        <p className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink-2">
          <span className="font-medium text-ink">Email alerts are off.</span> Set <code>RESEND_API_KEY</code> and{" "}
          <code>LEAD_NOTIFY_EMAIL</code> to get an email for every new request.
        </p>
      )}

      <form className="flex flex-wrap gap-2 text-sm" method="get">
        <label className="sr-only" htmlFor="q">
          Search requests
        </label>
        <input
          id="q"
          name="q"
          defaultValue={sp.q}
          placeholder="Search name, email or website…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent sm:max-w-xs"
        />
        <label className="sr-only" htmlFor="type">
          Type
        </label>
        <select id="type" name="type" defaultValue={sp.type ?? ""} className="h-10 rounded-lg border border-line bg-surface px-2">
          <option value="">All types</option>
          <option value="audit">Full report</option>
          <option value="website">New website</option>
        </select>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-lg border border-line bg-surface px-2">
          <option value="">Any status</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-lg bg-accent px-4 font-medium text-accent-ink hover:bg-accent-hover">Apply</button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-10 text-center text-muted">
          No requests yet. They appear here when visitors click “Request full report” or “Request a quote”.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    {TYPE_LABEL[r.type]} · {fmtDateTime(r.created_at)}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {r.name}
                    {r.user_id && <span className="ml-2 align-middle text-xs font-normal text-muted">(signed-in user)</span>}
                  </p>
                  <a href={`mailto:${r.email}`} className="text-sm text-accent hover:underline">
                    {r.email}
                  </a>
                </div>
                <form action={updateStatus} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name="id" value={r.id} />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  <label className="sr-only" htmlFor={`status-${r.id}`}>
                    Change status
                  </label>
                  <select id={`status-${r.id}`} name="status" defaultValue={r.status} className="h-9 rounded-lg border border-line bg-surface px-2">
                    {REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button className="h-9 rounded-lg border border-line bg-surface px-3 hover:bg-surface-2">Save</button>
                </form>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {r.website && (
                  <div className="min-w-0">
                    <dt className="text-muted">Website</dt>
                    <dd className="truncate">
                      <a
                        href={/^https?:\/\//.test(r.website) ? r.website : `https://${r.website}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:underline"
                      >
                        {r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </dd>
                  </div>
                )}
                {r.project_type && (
                  <div>
                    <dt className="text-muted">Project</dt>
                    <dd>{r.project_type}</dd>
                  </div>
                )}
                {r.budget && (
                  <div>
                    <dt className="text-muted">Budget</dt>
                    <dd>{r.budget}</dd>
                  </div>
                )}
              </dl>
              {r.message && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm whitespace-pre-wrap text-ink-2">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={{ q: sp.q, type: sp.type, status: sp.status }} />
    </div>
  );
}
