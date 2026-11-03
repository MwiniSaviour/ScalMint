import { describe, expect, it } from "vitest";
import { burnRate, errorBudgetRemaining } from "@/lib/ops/slo";

describe("SLO error budget", () => {
  it("is MISSING when there are no probe runs", () => {
    expect(errorBudgetRemaining(null)).toEqual({ remaining: null, quality: "MISSING" });
    expect(burnRate(null)).toBeNull();
  });

  it("is full when availability is 100%", () => {
    expect(errorBudgetRemaining(1).remaining).toBe(1);
    expect(burnRate(1)).toBe(0);
  });

  it("is exhausted at the SLO and negative below it", () => {
    expect(errorBudgetRemaining(0.999).remaining).toBeCloseTo(0);
    expect(errorBudgetRemaining(0.998).remaining).toBeLessThan(0);
    expect(burnRate(0.999)).toBeCloseTo(1);
  });
});
