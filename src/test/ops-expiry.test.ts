import { describe, expect, it } from "vitest";
import { daysUntil, expiryBucket } from "@/lib/ops/expiry";

describe("asset expiry buckets", () => {
  const now = new Date("2026-03-01T00:00:00.000Z");

  it("maps 30/14/7/1 day windows", () => {
    expect(expiryBucket(new Date("2026-03-25T00:00:00.000Z"), now)).toBe(30);
    expect(expiryBucket(new Date("2026-03-12T00:00:00.000Z"), now)).toBe(14);
    expect(expiryBucket(new Date("2026-03-05T00:00:00.000Z"), now)).toBe(7);
    expect(expiryBucket(new Date("2026-03-02T00:00:00.000Z"), now)).toBe(1);
  });

  it("ignores far-future expiries", () => {
    expect(expiryBucket(new Date("2026-12-01T00:00:00.000Z"), now)).toBeNull();
  });

  it("counts remaining days", () => {
    expect(daysUntil(new Date("2026-03-11T00:00:00.000Z"), now)).toBe(10);
  });
});
