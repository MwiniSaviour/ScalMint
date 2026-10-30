import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/paystack/route";
import { db } from "@/lib/db";

interface DbMock {
  $transaction: Mock;
  webhookEvent: { create: Mock; findUnique: Mock; update: Mock };
  affiliate: { findUnique: Mock; update: Mock };
  product: { findUnique: Mock };
  payout: { findUnique: Mock; update: Mock };
  __tx: {
    conversion: { findFirst: Mock; create: Mock };
    affiliate: { update: Mock };
  };
}

vi.mock("@/lib/db", () => {
  const tx = {
    conversion: { findFirst: vi.fn(), create: vi.fn() },
    affiliate: { update: vi.fn() },
  };
  const db = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
    webhookEvent: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    affiliate: { findUnique: vi.fn(), update: vi.fn() },
    product: { findUnique: vi.fn() },
    payout: { findUnique: vi.fn(), update: vi.fn() },
    __tx: tx,
  };
  return { db };
});

const mockDb = db as unknown as DbMock;

const AFFILIATE = {
  id: "aff_1",
  code: "SCAL-ABCDEFGH",
  email: "AFF@example.com",
  status: "APPROVED",
};

const OPERASCH = {
  id: "prd_operasch",
  slug: "operasch",
  status: "LIVE",
  commissionType: "PERCENT_ONE_TIME",
  commissionRate: 3000,
  commissionCap: 40000,
};

const NOVA = {
  id: "prd_nova",
  slug: "nova-pos",
  status: "LIVE",
  commissionType: "PERCENT_RECURRING",
  commissionRate: 3000,
  commissionCap: 50000,
};

const SECRET = "test_secret";

const paystackSig = (raw: string, secret: string = SECRET) =>
  crypto.createHmac("sha512", secret).update(raw).digest("hex");

const hubSig = (raw: string, secret: string, ts: number = Date.now()) =>
  `t=${ts},v1=${crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${raw}`)
    .digest("hex")}`;

const makeRequest = (raw: string, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/webhooks/paystack", {
    method: "POST",
    headers,
    body: raw,
  });

const chargeData = (overrides: Record<string, unknown> = {}) => ({
  reference: "ref_test_1",
  amount: 50000,
  currency: "GHS",
  customer: { email: "Buyer@Example.com" },
  metadata: { affiliate_code: "scal-abcdefgh", product_slug: "operasch" },
  ...overrides,
});

const postCharge = (
  data: Record<string, unknown>,
  event = "charge.success",
) => {
  const raw = JSON.stringify({ event, data });
  return POST(makeRequest(raw, { "x-paystack-signature": paystackSig(raw) }));
};

describe("Paystack webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    mockDb.webhookEvent.create.mockResolvedValue({
      id: "evt_new",
      processed: false,
    });
    mockDb.webhookEvent.update.mockResolvedValue({});
    mockDb.affiliate.findUnique.mockResolvedValue(AFFILIATE);
    mockDb.product.findUnique.mockResolvedValue(OPERASCH);
    mockDb.__tx.conversion.findFirst.mockResolvedValue(null);
    mockDb.__tx.conversion.create.mockResolvedValue({ id: "conv_new" });
    mockDb.__tx.affiliate.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid signature with 401 and writes nothing", async () => {
    const raw = JSON.stringify({ event: "charge.success", data: chargeData() });
    const res = await POST(
      makeRequest(raw, { "x-paystack-signature": "deadbeef" }),
    );
    expect(res.status).toBe(401);
    expect(mockDb.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const raw = "not-json";
    const res = await POST(
      makeRequest(raw, { "x-paystack-signature": paystackSig(raw) }),
    );
    expect(res.status).toBe(400);
  });

  it("ignores Nova internal references before creating an event", async () => {
    const raw = JSON.stringify({
      event: "charge.success",
      data: chargeData({ reference: "NOVA-xyz" }),
    });
    const res = await POST(
      makeRequest(raw, { "x-paystack-signature": paystackSig(raw) }),
    );
    expect(await res.json()).toEqual({ ok: true, ignored: "nova_internal" });
    expect(mockDb.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("records a new one-time conversion with the exact contract", async () => {
    const data = chargeData();
    const raw = JSON.stringify({ event: "charge.success", data });
    const res = await POST(
      makeRequest(raw, { "x-paystack-signature": paystackSig(raw) }),
    );
    expect(mockDb.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "paystack",
        event: "charge.success",
        reference: "ref_test_1",
        payload: raw,
      },
    });
    expect(mockDb.affiliate.findUnique).toHaveBeenCalledWith({
      where: { code: "SCAL-ABCDEFGH" },
    });
    expect(mockDb.product.findUnique).toHaveBeenCalledWith({
      where: { slug: "operasch" },
    });
    expect(mockDb.__tx.conversion.findFirst).toHaveBeenCalledWith({
      where: {
        customerEmail: "buyer@example.com",
        productId: "prd_operasch",
        isOneTime: true,
      },
      select: { id: true },
    });
    expect(mockDb.__tx.conversion.create).toHaveBeenCalledWith({
      data: {
        affiliateId: "aff_1",
        productId: "prd_operasch",
        status: "PENDING",
        customerEmail: "buyer@example.com",
        customerRef: "ref_test_1",
        amount: 50000,
        commissionAmount: 15000,
        currency: "GHS",
        isOneTime: true,
        fraudFlags: "[]",
      },
    });
    expect(mockDb.__tx.affiliate.update).toHaveBeenCalledWith({
      where: { id: "aff_1" },
      data: {
        totalConversions: { increment: 1 },
        totalEarned: { increment: 15000 },
      },
    });
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: "ref_test_1" },
      data: { processed: true },
    });
    expect(await res.json()).toEqual({ ok: true, credited: 1 });
  });

  it("short-circuits an already-processed event", async () => {
    mockDb.webhookEvent.findUnique.mockResolvedValue({
      id: "evt_old",
      processed: true,
    });
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("reprocesses an unprocessed duplicate created by a concurrent race", async () => {
    mockDb.webhookEvent.create.mockRejectedValueOnce({ code: "P2002" });
    mockDb.webhookEvent.findUnique.mockResolvedValue({
      id: "evt_old",
      processed: false,
    });
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({ ok: true, credited: 1 });
  });

  it("skips a duplicate one-time conversion for the same customer", async () => {
    mockDb.__tx.conversion.findFirst.mockResolvedValue({ id: "conv_old" });
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({
      ok: true,
      reason: "duplicate_conversion",
    });
    expect(mockDb.__tx.conversion.create).not.toHaveBeenCalled();
    expect(mockDb.__tx.affiliate.update).not.toHaveBeenCalled();
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: "ref_test_1" },
      data: { processed: true },
    });
  });

  it("converges on the pre-check path after losing the one-time race", async () => {
    mockDb.$transaction.mockRejectedValueOnce({ code: "P2002" });
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({
      ok: true,
      reason: "duplicate_conversion",
    });
    expect(mockDb.webhookEvent.update).not.toHaveBeenCalled();
  });

  it("rejects a self-referral without crediting the affiliate", async () => {
    const res = await postCharge(
      chargeData({ customer: { email: "aff@example.com" } }),
    );
    expect(mockDb.__tx.conversion.create).toHaveBeenCalledWith({
      data: {
        affiliateId: "aff_1",
        productId: "prd_operasch",
        status: "REJECTED",
        customerEmail: "aff@example.com",
        customerRef: "ref_test_1",
        amount: 50000,
        commissionAmount: 0,
        currency: "GHS",
        isOneTime: true,
        fraudFlags: '["self_referral"]',
      },
    });
    expect(mockDb.__tx.affiliate.update).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({
      ok: true,
      credited: 0,
      reason: "self_referral",
    });
  });

  it("reports affiliate_not_found", async () => {
    mockDb.affiliate.findUnique.mockResolvedValue(null);
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({
      ok: true,
      reason: "affiliate_not_found",
    });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: "ref_test_1" },
      data: { processed: true },
    });
  });

  it("reports affiliate_not_approved", async () => {
    mockDb.affiliate.findUnique.mockResolvedValue({
      ...AFFILIATE,
      status: "PENDING",
    });
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({
      ok: true,
      reason: "affiliate_not_approved",
    });
  });

  it("reports product_not_found", async () => {
    mockDb.product.findUnique.mockResolvedValue(null);
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({ ok: true, reason: "product_not_found" });
  });

  it("reports product_not_live", async () => {
    mockDb.product.findUnique.mockResolvedValue({
      ...OPERASCH,
      status: "COMING_SOON",
    });
    const res = await postCharge(chargeData());
    expect(await res.json()).toEqual({ ok: true, reason: "product_not_live" });
  });

  it("skips charges with no customer email", async () => {
    const res = await postCharge(chargeData({ customer: undefined }));
    expect(await res.json()).toEqual({ ok: true, reason: "skipped_no_email" });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("skips charges with a non-positive amount", async () => {
    const res = await postCharge(chargeData({ amount: 0 }));
    expect(await res.json()).toEqual({ ok: true, reason: "invalid_amount" });
  });

  it("attributes legacy ref-only payloads to Nova POS", async () => {
    mockDb.product.findUnique.mockResolvedValue(NOVA);
    const res = await postCharge(
      chargeData({ metadata: { ref: "SCAL-ABCDEFGH" } }),
    );
    expect(mockDb.product.findUnique).toHaveBeenCalledWith({
      where: { slug: "nova-pos" },
    });
    expect(mockDb.__tx.conversion.create).toHaveBeenCalledWith({
      data: {
        affiliateId: "aff_1",
        productId: "prd_nova",
        status: "PENDING",
        customerEmail: "buyer@example.com",
        customerRef: "ref_test_1",
        amount: 50000,
        commissionAmount: 15000,
        currency: "GHS",
        isOneTime: false,
        fraudFlags: "[]",
      },
    });
    expect(await res.json()).toEqual({ ok: true, credited: 1 });
  });

  it("caps the commission and flags it without crediting totals", async () => {
    const res = await postCharge(chargeData({ amount: 2_000_000 }));
    expect(await res.json()).toEqual({ ok: true, credited: 0 });
    expect(mockDb.__tx.conversion.create).toHaveBeenCalledWith({
      data: {
        affiliateId: "aff_1",
        productId: "prd_operasch",
        status: "PENDING",
        customerEmail: "buyer@example.com",
        customerRef: "ref_test_1",
        amount: 2_000_000,
        commissionAmount: 0,
        currency: "GHS",
        isOneTime: true,
        fraudFlags: '["commission_capped"]',
      },
    });
    expect(mockDb.__tx.affiliate.update).not.toHaveBeenCalled();
  });

  it("marks a transfer.success payout as SUCCESS", async () => {
    mockDb.payout.findUnique.mockResolvedValue({ id: "po_1" });
    const res = await postCharge(
      { reference: "aff_payout_1" },
      "transfer.success",
    );
    expect(mockDb.payout.findUnique).toHaveBeenCalledWith({
      where: { reference: "aff_payout_1" },
    });
    expect(mockDb.payout.update).toHaveBeenCalledWith({
      where: { reference: "aff_payout_1" },
      data: {
        status: "SUCCESS",
        processedAt: expect.any(Date),
        failureReason: null,
      },
    });
    expect(await res.json()).toEqual({ ok: true });
  });

  it("marks a transfer.failed payout as FAILED with the reason", async () => {
    mockDb.payout.findUnique.mockResolvedValue({ id: "po_1" });
    const res = await postCharge(
      { reference: "aff_payout_1", reason: "insufficient funds" },
      "transfer.failed",
    );
    expect(mockDb.payout.update).toHaveBeenCalledWith({
      where: { reference: "aff_payout_1" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        failureReason: "insufficient funds",
      },
    });
    expect(await res.json()).toEqual({ ok: true });
  });

  it("acknowledges unrelated events without side effects", async () => {
    const res = await postCharge(chargeData(), "charge.refund");
    expect(await res.json()).toEqual({ ok: true, ignored: "charge.refund" });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: "ref_test_1" },
      data: { processed: true },
    });
  });

  it("accepts a valid hub signature and processes the charge", async () => {
    vi.stubEnv("AFFILIATE_HUB_SECRET", "hub_secret");
    const raw = JSON.stringify({ event: "charge.success", data: chargeData() });
    const res = await POST(
      makeRequest(raw, { "x-hub-signature": hubSig(raw, "hub_secret") }),
    );
    expect(await res.json()).toEqual({ ok: true, credited: 1 });
  });

  it("rejects an invalid hub signature with 401", async () => {
    vi.stubEnv("AFFILIATE_HUB_SECRET", "hub_secret");
    const raw = JSON.stringify({ event: "charge.success", data: chargeData() });
    const res = await POST(
      makeRequest(raw, { "x-hub-signature": "t=1,v1=deadbeef" }),
    );
    expect(res.status).toBe(401);
  });
});
