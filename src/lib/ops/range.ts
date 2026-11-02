import type { RangeKey } from "@/lib/ops/types";

export function parseRange(raw: string | null | undefined, fallback: RangeKey): RangeKey {
  const v = (raw ?? "").toLowerCase();
  if (v === "24h" || v === "7d" || v === "30d" || v === "90d" || v === "mtd" || v === "qtd" || v === "ytd") {
    return v;
  }
  return fallback;
}

export function rangeWindow(range: RangeKey, now = new Date()): { start: Date; end: Date; label: string } {
  const end = new Date(now);
  const start = new Date(now);
  if (range === "24h") start.setUTCHours(start.getUTCHours() - 24);
  else if (range === "7d") start.setUTCDate(start.getUTCDate() - 7);
  else if (range === "30d") start.setUTCDate(start.getUTCDate() - 30);
  else if (range === "90d") start.setUTCDate(start.getUTCDate() - 90);
  else if (range === "mtd") start.setUTCDate(1), start.setUTCHours(0, 0, 0, 0);
  else if (range === "qtd") {
    const q = Math.floor(start.getUTCMonth() / 3) * 3;
    start.setUTCMonth(q, 1);
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
  }
  const labels: Record<RangeKey, string> = {
    "24h": "last 24 hours",
    "7d": "last 7 days",
    "30d": "last 30 days",
    "90d": "last 90 days",
    mtd: "month to date",
    qtd: "quarter to date",
    ytd: "year to date",
  };
  return { start, end, label: labels[range] };
}
