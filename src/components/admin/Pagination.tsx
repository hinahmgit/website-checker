import Link from "next/link";

export default function Pagination({ page, total, pageSize, params }: {
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `?${s}` : "?";
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-ink-2">
      <span className="tabular">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:bg-surface-2">
            ← Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:bg-surface-2">
            Next →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
