import { timeZone } from "./admin-data";

export const fmtNum = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("en-US"));

export function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone(),
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timeZone(), day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/** "+25%" style change; null when there's no baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}
