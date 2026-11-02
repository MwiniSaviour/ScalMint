import type { HealthStatus } from "@/lib/ops/types";
import { HEALTH_ORDER } from "@/lib/ops/types";

export function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.length === 0) return "UNKNOWN";
  return HEALTH_ORDER.find((s) => statuses.includes(s)) ?? "UNKNOWN";
}

/** Probe success is availability, not traffic error rate. */
export function checkStatus(input: {
  active: boolean;
  lastRunAt: Date | null;
  consecutiveFailures: number;
  intervalSec: number;
  latencyMs: number | null;
  latencyBudgetMs: number | null;
  now?: Date;
}): HealthStatus {
  if (!input.active || !input.lastRunAt) return "UNKNOWN";
  const now = input.now ?? new Date();
  const staleMs = input.intervalSec * 3 * 1000;
  if (now.getTime() - input.lastRunAt.getTime() > staleMs) return "DOWN";
  if (input.consecutiveFailures >= 3) return "DOWN";
  if (input.consecutiveFailures >= 1) return "DEGRADED";
  if (
    input.latencyBudgetMs != null &&
    input.latencyMs != null &&
    input.latencyMs > input.latencyBudgetMs &&
    input.consecutiveFailures === 0
  ) {
    return "DEGRADED";
  }
  return "UP";
}

export function statusLabel(status: HealthStatus): string {
  if (status === "DOWN") return "Down";
  if (status === "DEGRADED") return "Degraded";
  if (status === "UP") return "Up";
  return "Unknown";
}
