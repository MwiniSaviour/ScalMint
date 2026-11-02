export type Scope =
  | { type: "portfolio"; label: "across N projects"; projectCount: number }
  | { type: "project"; projectId: string; projectKey: string };

export type MetricQualityView = "OK" | "STALE" | "UNKNOWN" | "MISSING";

export type MetricView = {
  key: string;
  label: string;
  value: number | null;
  display: string;
  unit: string;
  window: string;
  source: string;
  asOf: string | null;
  quality: MetricQualityView;
  deltaPercent: number | null;
  target: string | null;
  formula: string;
};

export type HealthStatus = "DOWN" | "DEGRADED" | "UNKNOWN" | "UP";

export const HEALTH_ORDER: HealthStatus[] = ["DOWN", "DEGRADED", "UNKNOWN", "UP"];

export type RangeKey = "24h" | "7d" | "30d" | "90d" | "mtd" | "qtd" | "ytd";

export const RANGE_KEYS: RangeKey[] = ["24h", "7d", "30d", "90d", "mtd", "qtd", "ytd"];

export type OpsSession = {
  operatorId: string;
  email: string;
  name: string;
  role: "OWNER" | "ADMIN" | "ANALYST" | "SUPPORT";
  sessionVersion: number;
};

export const WRITE_ROLES = ["OWNER", "ADMIN"] as const;
export const SUPPORT_WRITE_ROLES = ["OWNER", "ADMIN", "SUPPORT"] as const;
