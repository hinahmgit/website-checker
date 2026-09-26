"use client";

import { useState } from "react";
import { BarList, ColumnChart, Tabs, type ColumnDatum } from "./charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dailyData(points: { date: string; count: number }[]): ColumnDatum[] {
  return points.map((p) => {
    const [y, m, d] = p.date.split("-").map(Number);
    return { tick: `${d} ${MONTHS[m - 1]}`, label: `${d} ${MONTHS[m - 1]} ${y}`, value: p.count };
  });
}

function monthlyData(points: { date: string; count: number }[]): ColumnDatum[] {
  return points.map((p) => {
    const [y, m] = p.date.split("-").map(Number);
    return { tick: m === 1 ? `Jan ’${String(y).slice(2)}` : MONTHS[m - 1], label: `${MONTHS[m - 1]} ${y}`, value: p.count };
  });
}

export function TrendChart({ daily, monthly }: { daily: { date: string; count: number }[]; monthly: { date: string; count: number }[] }) {
  const [range, setRange] = useState<"30d" | "24m">("30d");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Checks over time</h2>
        <Tabs
          value={range}
          onChange={setRange}
          options={[
            { value: "30d", label: "Last 30 days" },
            { value: "24m", label: "Last 24 months" },
          ]}
        />
      </div>
      {range === "30d" ? (
        <ColumnChart data={dailyData(daily)} tickEvery={7} />
      ) : (
        <ColumnChart data={monthlyData(monthly)} tickEvery={3} />
      )}
    </>
  );
}

export function PlatformChart({ all, month }: { all: { platform: string; count: number }[]; month: { platform: string; count: number }[] }) {
  const [range, setRange] = useState<"all" | "month">("all");
  const rows = (range === "all" ? all : month);
  // Keep the list readable: top 9, then fold the rest into "Other".
  const top = rows.slice(0, 9).map((r) => ({ label: r.platform, value: r.count }));
  const rest = rows.slice(9).reduce((s, r) => s + r.count, 0);
  if (rest > 0) top.push({ label: "Other", value: rest });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Platforms</h2>
        <Tabs
          value={range}
          onChange={setRange}
          options={[
            { value: "all", label: "All time" },
            { value: "month", label: "This month" },
          ]}
        />
      </div>
      <BarList data={top} emptyText={range === "month" ? "No checks this month yet." : "No checks yet."} />
    </>
  );
}
