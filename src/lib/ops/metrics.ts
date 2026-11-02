import type { HealthStatus, MetricQualityView, MetricView } from "@/lib/ops/types";

export type SubscriptionInput = {
  tenantRef: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  mrrMinor: number;
  periodStart: Date;
  periodEnd: Date;
};

export type RevenueInput = {
  kind: "PAYMENT" | "REFUND" | "FEE" | "ADJUSTMENT";
  amountMinor: number;
  occurredAt: Date;
};

export type ProbeInput = {
  ok: boolean;
  startedAt: Date;
  latencyMs: number | null;
  intervalSec: number;
};

const MISSING = "—";

export function formatMetricNumber(value: number | null, quality: MetricQualityView, decimals = 0): string {
  if (quality === "MISSING") return "No data";
  if (quality === "UNKNOWN") return "Not connected";
  if (value == null) return MISSING;
  return value.toLocaleString("en-GH", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function metricView(partial: Omit<MetricView, "display"> & { decimals?: number }): MetricView {
  return {
    ...partial,
    display: formatMetricNumber(partial.value, partial.quality, partial.decimals ?? 0),
  };
}

/** MRR = Σ mrrMinor where periodStart <= asOf < periodEnd and status ACTIVE|PAST_DUE. Excludes one-time cash. */
export function mrrAt(facts: SubscriptionInput[], asOf: Date): { valueMinor: number | null; quality: MetricQualityView } {
  if (facts.length === 0) return { valueMinor: null, quality: "MISSING" };
  const sum = facts
    .filter((f) => (f.status === "ACTIVE" || f.status === "PAST_DUE") && f.periodStart <= asOf && asOf < f.periodEnd)
    .reduce((n, f) => n + f.mrrMinor, 0);
  return { valueMinor: sum, quality: "OK" };
}

export function arrFromMrr(mrrMinor: number | null): number | null {
  if (mrrMinor == null) return null;
  return mrrMinor * 12;
}

export function collectedInWindow(events: RevenueInput[], start: Date, end: Date): number {
  return events
    .filter((e) => e.kind === "PAYMENT" && e.occurredAt >= start && e.occurredAt < end)
    .reduce((n, e) => n + e.amountMinor, 0);
}

export function refundsInWindow(events: RevenueInput[], start: Date, end: Date): number {
  return events
    .filter((e) => e.kind === "REFUND" && e.occurredAt >= start && e.occurredAt < end)
    .reduce((n, e) => n + e.amountMinor, 0);
}

export type MrrMovement = {
  start: number;
  end: number;
  neu: number;
  expansion: number;
  contraction: number;
  churn: number;
  netNew: number;
};

export function mrrMovement(startFacts: SubscriptionInput[], endFacts: SubscriptionInput[], startAt: Date, endAt: Date): MrrMovement {
  const startMap = tenantMrr(startFacts, startAt);
  const endMap = tenantMrr(endFacts, endAt);
  let neu = 0;
  let expansion = 0;
  let contraction = 0;
  let churn = 0;
  const tenants = new Set([...startMap.keys(), ...endMap.keys()]);
  for (const t of tenants) {
    const a = startMap.get(t) ?? 0;
    const b = endMap.get(t) ?? 0;
    if (a === 0 && b > 0) neu += b;
    else if (a > 0 && b === 0) churn += a;
    else if (b > a) expansion += b - a;
    else if (a > b) contraction += a - b;
  }
  const start = [...startMap.values()].reduce((n, v) => n + v, 0);
  const end = [...endMap.values()].reduce((n, v) => n + v, 0);
  return { start, end, neu, expansion, contraction, churn, netNew: neu + expansion - contraction - churn };
}

function tenantMrr(facts: SubscriptionInput[], asOf: Date): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of facts) {
    if (!(f.status === "ACTIVE" || f.status === "PAST_DUE")) continue;
    if (!(f.periodStart <= asOf && asOf < f.periodEnd)) continue;
    map.set(f.tenantRef, (map.get(f.tenantRef) ?? 0) + f.mrrMinor);
  }
  return map;
}

export function logoChurn(startFacts: SubscriptionInput[], endFacts: SubscriptionInput[], startAt: Date, endAt: Date): number | null {
  const start = tenantMrr(startFacts, startAt);
  if (start.size === 0) return null;
  const end = tenantMrr(endFacts, endAt);
  let lost = 0;
  for (const t of start.keys()) if (!end.has(t)) lost += 1;
  return lost / start.size;
}

export function nrr(movement: MrrMovement): number | null {
  if (movement.start === 0) return null;
  return (movement.start + movement.expansion - movement.contraction - movement.churn) / movement.start;
}

/** Run-based availability. Project headline weights components by criticality P1=3, P2=2, P3=1. */
export function availability(runs: { ok: boolean }[]): number | null {
  if (runs.length === 0) return null;
  return runs.filter((r) => r.ok).length / runs.length;
}

export function weightedAvailability(
  components: { criticality: "P1" | "P2" | "P3"; ratio: number | null }[],
): number | null {
  const weight = { P1: 3, P2: 2, P3: 1 };
  let num = 0;
  let den = 0;
  for (const c of components) {
    if (c.ratio == null) continue;
    num += c.ratio * weight[c.criticality];
    den += weight[c.criticality];
  }
  if (den === 0) return null;
  return num / den;
}

/** Portfolio availability weights projects by MRR. */
export function mrrWeightedAvailability(rows: { mrrMinor: number; ratio: number | null }[]): number | null {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    if (r.ratio == null || r.mrrMinor <= 0) continue;
    num += r.ratio * r.mrrMinor;
    den += r.mrrMinor;
  }
  if (den === 0) return null;
  return num / den;
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? null;
}

export function freshnessMinutes(last: Date | null, now = new Date()): number | null {
  if (!last) return null;
  return Math.max(0, (now.getTime() - last.getTime()) / 60000);
}

export function pesewasToMajor(minor: number | null): number | null {
  if (minor == null) return null;
  return minor / 100;
}

export type ComponentHealthInput = {
  status: HealthStatus;
  mrrMinor?: number;
};

export function projectHealth(components: { status: HealthStatus }[]): HealthStatus {
  if (components.length === 0) return "UNKNOWN";
  const order: HealthStatus[] = ["DOWN", "DEGRADED", "UNKNOWN", "UP"];
  return order.find((s) => components.some((c) => c.status === s)) ?? "UNKNOWN";
}
