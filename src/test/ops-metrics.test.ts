import { describe, expect, it } from "vitest";
import {
  arrFromMrr,
  availability,
  collectedInWindow,
  formatMetricNumber,
  logoChurn,
  mrrAt,
  mrrMovement,
  mrrWeightedAvailability,
  nrr,
} from "@/lib/ops/metrics";
import { checkStatus, worstStatus } from "@/lib/ops/status";

const day = (n: number) => new Date(`2026-01-${String(n).padStart(2, "0")}T00:00:00.000Z`);

describe("MRR", () => {
  it("sums ACTIVE and PAST_DUE facts covering as-of and ignores one-time cash", () => {
    const facts = [
      { tenantRef: "a", status: "ACTIVE" as const, mrrMinor: 10000, periodStart: day(1), periodEnd: day(31) },
      { tenantRef: "b", status: "PAST_DUE" as const, mrrMinor: 5000, periodStart: day(1), periodEnd: day(31) },
      { tenantRef: "c", status: "CANCELED" as const, mrrMinor: 8000, periodStart: day(1), periodEnd: day(31) },
    ];
    expect(mrrAt(facts, day(15)).valueMinor).toBe(15000);
    expect(arrFromMrr(15000)).toBe(180000);
  });

  it("returns MISSING rather than zero when there are no facts", () => {
    expect(mrrAt([], day(15))).toEqual({ valueMinor: null, quality: "MISSING" });
    expect(formatMetricNumber(0, "MISSING")).toBe("No data");
    expect(formatMetricNumber(null, "UNKNOWN")).toBe("Not connected");
  });
});

describe("cash vs MRR", () => {
  it("collects PAYMENT events only in the window", () => {
    const events = [
      { kind: "PAYMENT" as const, amountMinor: 2000, occurredAt: day(5) },
      { kind: "REFUND" as const, amountMinor: 500, occurredAt: day(6) },
      { kind: "PAYMENT" as const, amountMinor: 1000, occurredAt: day(20) },
    ];
    expect(collectedInWindow(events, day(1), day(10))).toBe(2000);
  });
});

describe("movement", () => {
  it("computes net new and NRR without averaging percentages", () => {
    const start = [{ tenantRef: "a", status: "ACTIVE" as const, mrrMinor: 100, periodStart: day(1), periodEnd: day(31) }];
    const end = [
      { tenantRef: "a", status: "ACTIVE" as const, mrrMinor: 80, periodStart: day(1), periodEnd: day(31) },
      { tenantRef: "b", status: "ACTIVE" as const, mrrMinor: 50, periodStart: day(1), periodEnd: day(31) },
    ];
    const m = mrrMovement(start, end, day(2), day(15));
    expect(m.contraction).toBe(20);
    expect(m.neu).toBe(50);
    expect(nrr(m)).toBeCloseTo(0.8);
    expect(logoChurn(start, end, day(2), day(15))).toBe(0);
  });
});

describe("availability", () => {
  it("is run-based and portfolio weights by MRR", () => {
    expect(availability([{ ok: true }, { ok: true }, { ok: false }])).toBeCloseTo(2 / 3);
    expect(availability([])).toBeNull();
    expect(
      mrrWeightedAvailability([
        { mrrMinor: 100, ratio: 1 },
        { mrrMinor: 300, ratio: 0.5 },
        { mrrMinor: 0, ratio: 0 },
      ]),
    ).toBeCloseTo((100 * 1 + 300 * 0.5) / 400);
  });
});

describe("health status", () => {
  it("orders DOWN > DEGRADED > UNKNOWN > UP and never treats empty as UP", () => {
    expect(worstStatus([])).toBe("UNKNOWN");
    expect(worstStatus(["UP", "DEGRADED"])).toBe("DEGRADED");
    expect(worstStatus(["UP", "DOWN", "UNKNOWN"])).toBe("DOWN");
    expect(
      checkStatus({
        active: false,
        lastRunAt: new Date(),
        consecutiveFailures: 0,
        intervalSec: 60,
        recentLatencies: [10],
        latencyBudgetMs: 200,
      }),
    ).toBe("UNKNOWN");
    expect(
      checkStatus({
        active: true,
        lastRunAt: new Date(),
        consecutiveFailures: 3,
        intervalSec: 60,
        recentLatencies: [10],
        latencyBudgetMs: 200,
      }),
    ).toBe("DOWN");
  });

  it("treats latency as DEGRADED only after 3 consecutive over-budget runs", () => {
    const base = {
      active: true,
      lastRunAt: new Date(),
      consecutiveFailures: 0,
      intervalSec: 60,
      latencyBudgetMs: 200,
    };
    expect(checkStatus({ ...base, recentLatencies: [300] })).toBe("UP");
    expect(checkStatus({ ...base, recentLatencies: [300, 300] })).toBe("UP");
    expect(checkStatus({ ...base, recentLatencies: [300, 300, 300] })).toBe("DEGRADED");
    expect(checkStatus({ ...base, recentLatencies: [300, 300, 100, 300] })).toBe("UP");
    expect(checkStatus({ ...base, recentLatencies: [300, null, 300] })).toBe("UP");
  });
});
