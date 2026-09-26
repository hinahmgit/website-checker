"use client";

import { useState } from "react";

export interface ColumnDatum {
  tick: string; // short axis label
  label: string; // full label for tooltip / table
  value: number;
}

function niceScale(max: number, targetTicks = 4) {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const safeStep = Math.max(1, step);
  const top = Math.ceil(max / safeStep) * safeStep;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += safeStep) ticks.push(v);
  return { top, ticks };
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** Single-series column chart for counts over time. */
export function ColumnChart({ data, unit = "checks", height = 200, tickEvery = 1 }: {
  data: ColumnDatum[];
  unit?: string;
  height?: number;
  tickEvery?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { top, ticks } = niceScale(Math.max(...data.map((d) => d.value), 0));
  const active = hover != null ? data[hover] : null;

  return (
    <figure>
      <div className="relative" style={{ height }}>
        {/* gridlines + y labels */}
        {ticks.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute inset-x-0 flex items-center"
            style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}
          >
            <span className="tabular w-9 shrink-0 pr-2 text-right text-[11px] text-muted">{fmt(t)}</span>
            <span className={`h-px flex-1 ${t === 0 ? "bg-(--axis)" : "bg-(--grid)"}`} />
          </div>
        ))}

        <div className="absolute inset-y-0 right-0 left-9 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.label}
              className="flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${d.label}: ${fmt(d.value)} ${unit}`}
            >
              <div
                className="w-full rounded-t-[4px] bg-series-1 transition-opacity"
                style={{
                  height: `${(d.value / top) * 100}%`,
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
          ))}
        </div>

        {active && hover != null && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
            style={{
              left: `calc(2.25rem + (100% - 2.25rem) * ${(hover + 0.5) / data.length})`,
              bottom: `calc(${(active.value / top) * 100}% + 8px)`,
            }}
          >
            <span className="text-muted">{active.label}</span>
            <span className="ml-2 font-semibold text-ink">
              {fmt(active.value)} {unit}
            </span>
          </div>
        )}
      </div>

      <div className="mt-1.5 ml-9 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 overflow-visible text-center text-[11px] whitespace-nowrap text-muted">
            {i % tickEvery === 0 ? d.tick : ""}
          </span>
        ))}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted hover:text-ink">View as table</summary>
        <table className="tabular mt-2 w-full max-w-sm text-left">
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-line">
                <td className="py-1 text-ink-2">{d.label}</td>
                <td className="py-1 text-right">{fmt(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars with direct value labels. */
export function BarList({ data, unit = "checks", emptyText = "No data yet." }: {
  data: { label: string; value: number }[];
  unit?: string;
  emptyText?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <p className="py-6 text-sm text-muted">{emptyText}</p>;
  return (
    <ul className="space-y-2">
      {data.map((d) => {
        const share = total ? Math.round((d.value / total) * 100) : 0;
        return (
          <li
            key={d.label}
            className="group grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm"
            title={`${d.label}: ${fmt(d.value)} ${unit} (${share}%)`}
          >
            <span className="truncate text-ink">{d.label}</span>
            <span className="h-5 rounded-r-[4px]">
              <span
                className="block h-full rounded-r-[4px] bg-series-1 transition-opacity group-hover:opacity-80"
                style={{ width: `${Math.max((d.value / max) * 100, 1)}%` }}
              />
            </span>
            <span className="tabular w-20 text-right text-ink-2">
              {fmt(d.value)} <span className="text-muted">· {share}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Small segmented control to switch between datasets. */
export function Tabs<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 font-medium ${o.value === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
