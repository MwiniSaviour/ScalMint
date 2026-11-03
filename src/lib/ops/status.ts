import type { HealthStatus } from "@/lib/ops/types";
import { HEALTH_ORDER } from "@/lib/ops/types";

export function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.length === 0) return "UNKNOWN";
  return HEALTH_ORDER.find((s) => statuses.includes(s)) ?? "UNKNOWN";
}

function overBudgetRuns(recentLatencies: (number | null)[] | undefined, budgetMs: number | null): number {
  if (budgetMs == null || !recentLatencies?.length) return 0;
  let streak = 0;
  for (const latency of recentLatencies) {
    if (latency == null || latency <= budgetMs) break;
    streak += 1;
  }
  return streak;
}

/** Probe success is availability, not traffic error rate. */
export function checkStatus(input: {
  active: boolean;
  lastRunAt: Date | null;
  consecutiveFailures: number;
  intervalSec: number;
  /** Newest first. Spec 7.3: latency DEGRADED needs 3 consecutive over-budget runs. */
  recentLatencies?: (number | null)[];
  latencyBudgetMs: number | null;
  now?: Date;
}): HealthStatus {
  if (!input.active || !input.lastRunAt) return "UNKNOWN";
  const now = input.now ?? new Date();
  const staleMs = input.intervalSec * 3 * 1000;
  if (now.getTime() - input.lastRunAt.getTime() > staleMs) return "DOWN";
  if (input.consecutiveFailures >= 3) return "DOWN";
  if (input.consecutiveFailures >= 1) return "DEGRADED";
  if (overBudgetRuns(input.recentLatencies, input.latencyBudgetMs) >= 3) return "DEGRADED";
  return "UP";
}

export function statusLabel(status: HealthStatus): string {
  if (status === "DOWN") return "Down";
  if (status === "DEGRADED") return "Degraded";
  if (status === "UP") return "Up";
  return "Unknown";
}
