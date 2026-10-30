import { describe, expect, it } from "vitest";
import { calcCommission } from "@/lib/affiliate/referral";

describe("calcCommission", () => {
  it("charges FLAT_CPA as a flat pesewas amount", () => {
    expect(
      calcCommission(
        { commissionType: "FLAT_CPA", commissionRate: 500, commissionCap: null },
        999999,
      ),
    ).toEqual({ commissionPesewas: 500, rateApplied: 500, capped: false });
  });

  it("honors the legacy lowercase flat_cpa type", () => {
    expect(
      calcCommission(
        { commissionType: "flat_cpa", commissionRate: 500, commissionCap: null },
        999999,
      ),
    ).toEqual({ commissionPesewas: 500, rateApplied: 500, capped: false });
  });

  it("computes recurring commission at basis points", () => {
    expect(
      calcCommission(
        { commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: 50000 },
        50000,
      ),
    ).toEqual({ commissionPesewas: 15000, rateApplied: 3000, capped: false });
  });

  it("rounds fractional commissions", () => {
    expect(
      calcCommission(
        { commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: 50000 },
        3333,
      ),
    ).toEqual({ commissionPesewas: 1000, rateApplied: 3000, capped: false });
  });

  it("clamps above the cap", () => {
    expect(
      calcCommission(
        { commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: 50000 },
        2_000_000,
      ),
    ).toEqual({ commissionPesewas: 50000, rateApplied: 3000, capped: true });
  });

  it("does not cap at exactly the cap", () => {
    expect(
      calcCommission(
        { commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: 50000 },
        166_667,
      ),
    ).toEqual({ commissionPesewas: 50000, rateApplied: 3000, capped: false });
  });

  it("never caps when the cap is null", () => {
    expect(
      calcCommission(
        { commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: null },
        2_000_000,
      ),
    ).toEqual({ commissionPesewas: 600000, rateApplied: 3000, capped: false });
  });
});
