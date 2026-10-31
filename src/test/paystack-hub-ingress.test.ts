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
import { NextResponse } from "next/server";
import { POST } from "@/app/api/paystack-webhook/route";
import { POST as attributionPOST } from "@/app/api/webhooks/paystack/route";
import { verifyHubSignature } from "@/lib/hub/signature";
import { db } from "@/lib/db";

interface DbMock {
  webhookEvent: { create: Mock; findUnique: Mock; update: Mock };
}

vi.mock("@/lib/db", () => ({
  db: {
    webhookEvent: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/app/api/webhooks/paystack/route", () => ({
  POST: vi.fn(),
}));

const mockDb = db as unknown as DbMock;
const mockAttribution = attributionPOST as unknown as Mock;

const PAYSTACK_SECRET = "ps_secret";
const HUB_SECRET = "hub_secret";
const OPERASCH_SECRET = "operasch_secret";
const OPERASCH_URL = "https://smartsos.example/api/webhooks/paystack";
const REFERENCE = "SCAL-ABC12345_ref";
const HUB_REFERENCE = `hub:${REFERENCE}`;

const raw = JSON.stringify({
  event: "charge.success",
  data: {
    reference: REFERENCE,
    amount: 50000,
    customer: { email: "buyer@example.com" },
  },
});

const paystackSig = (body: string) =>
  crypto.createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");

const makeRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/paystack-webhook", {
    method: "POST",
    headers: { "x-paystack-signature": paystackSig(raw), ...headers },
    body: raw,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("PAYSTACK_SECRET_KEY", PAYSTACK_SECRET);
  vi.stubEnv("AFFILIATE_HUB_SECRET", HUB_SECRET);
  vi.stubEnv("HUB_SUBSCRIBERS", "");
  vi.stubEnv("HUB_SUBSCRIBER_NAMES", "operasch");
  vi.stubEnv("HUB_SUBSCRIBER_OPERASCH_URL", OPERASCH_URL);
  vi.stubEnv("HUB_SUBSCRIBER_OPERASCH_SECRET", OPERASCH_SECRET);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
  );
  mockDb.webhookEvent.create.mockResolvedValue({});
  mockDb.webhookEvent.update.mockResolvedValue({});
  mockAttribution.mockResolvedValue(
    NextResponse.json({ ok: true, credited: 1 }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Paystack hub ingress", () => {
  it("fans out to subscribers and self-attribution, then marks the event processed", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      modules: ["operasch", "scalmint"],
    });

    const fetchMock = fetch as unknown as Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OPERASCH_URL);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(raw);
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-hub-signature": expect.any(String),
    });
    expect(
      verifyHubSignature(
        OPERASCH_SECRET,
        raw,
        (init.headers as Record<string, string>)["x-hub-signature"],
      ),
    ).toBe(true);

    expect(mockAttribution).toHaveBeenCalledTimes(1);
    const attributionRequest = mockAttribution.mock.calls[0][0] as Request;
    await expect(attributionRequest.text()).resolves.toBe(raw);
    expect(
      verifyHubSignature(
        HUB_SECRET,
        raw,
        attributionRequest.headers.get("x-hub-signature") ?? "",
      ),
    ).toBe(true);

    expect(mockDb.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "paystack",
        event: "charge.success",
        reference: HUB_REFERENCE,
        payload: raw,
        processed: false,
      },
    });
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: HUB_REFERENCE },
      data: { processed: true },
    });
  });

  it("returns 500 and leaves the event unprocessed when a subscriber delivery fails", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 500 })),
    );

    const pending = POST(makeRequest());
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "delivery_failed",
      failed: ["operasch"],
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(mockDb.webhookEvent.update).not.toHaveBeenCalled();
  });

  it("retries a failed subscriber delivery and succeeds on the next attempt", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = POST(makeRequest());
    await vi.advanceTimersByTimeAsync(2_000);
    const response = await pending;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      modules: ["operasch", "scalmint"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: HUB_REFERENCE },
      data: { processed: true },
    });
  });

  it("does not retry a non-retryable 4xx subscriber rejection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockDb.webhookEvent.update).not.toHaveBeenCalled();
  });

  it("still delivers to healthy subscribers when another subscriber fails", async () => {
    vi.useFakeTimers();
    vi.stubEnv("HUB_SUBSCRIBER_NAMES", "operasch,nova");
    vi.stubEnv(
      "HUB_SUBSCRIBER_NOVA_URL",
      "https://nova.example/api/webhooks/paystack",
    );
    vi.stubEnv("HUB_SUBSCRIBER_NOVA_SECRET", "nova_secret");
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url === OPERASCH_URL
          ? new Response("{}", { status: 200 })
          : new Response("nope", { status: 500 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = POST(makeRequest());
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "delivery_failed",
      failed: ["nova"],
    });
    expect(
      fetchMock.mock.calls.filter(([url]) => url === OPERASCH_URL),
    ).toHaveLength(1);
    expect(mockDb.webhookEvent.update).not.toHaveBeenCalled();
  });

  it("returns 500 and leaves the event unprocessed when self-attribution fails", async () => {
    vi.stubEnv("HUB_SUBSCRIBER_NAMES", "");
    mockAttribution.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "delivery_failed",
      failed: ["scalmint"],
    });
    expect(mockDb.webhookEvent.update).not.toHaveBeenCalled();
  });

  it("fails loudly when AFFILIATE_HUB_SECRET is missing", async () => {
    vi.stubEnv("AFFILIATE_HUB_SECRET", "");
    vi.stubEnv("HUB_SUBSCRIBER_NAMES", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "delivery_failed",
      failed: ["scalmint"],
    });
    expect(mockAttribution).not.toHaveBeenCalled();
    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes("AFFILIATE_HUB_SECRET"),
      ),
    ).toBe(true);
  });

  it("short-circuits a duplicate whose event was already processed", async () => {
    mockDb.webhookEvent.create.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    mockDb.webhookEvent.findUnique.mockResolvedValue({ processed: true });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      duplicate: true,
    });
    expect(mockDb.webhookEvent.findUnique).toHaveBeenCalledWith({
      where: { reference: HUB_REFERENCE },
      select: { processed: true },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(mockAttribution).not.toHaveBeenCalled();
    expect(mockDb.webhookEvent.update).not.toHaveBeenCalled();
  });

  it("reprocesses a duplicate whose earlier delivery failed", async () => {
    mockDb.webhookEvent.create.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    mockDb.webhookEvent.findUnique.mockResolvedValue({ processed: false });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      modules: ["operasch", "scalmint"],
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockAttribution).toHaveBeenCalledTimes(1);
    expect(mockDb.webhookEvent.update).toHaveBeenCalledWith({
      where: { reference: HUB_REFERENCE },
      data: { processed: true },
    });
  });

  it("rejects an invalid Paystack signature without touching the database", async () => {
    const response = await POST(
      makeRequest({ "x-paystack-signature": "deadbeef" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid signature",
    });
    expect(mockDb.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("rejects test-key signatures in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", PAYSTACK_SECRET);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mockDb.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("accepts test-key signatures outside production", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", PAYSTACK_SECRET);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockDb.webhookEvent.create).toHaveBeenCalledTimes(1);
  });
});
