import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  hubReference,
  resolveHubSubscribers,
  routeTargets,
} from "@/lib/hub/subscribers";
import { hubSignature } from "@/lib/hub/signature";
import { POST as attributionPOST } from "@/app/api/webhooks/paystack/route";
import { isUniqueViolation } from "@/lib/db-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RAW_BYTES = 1024 * 1024;
const DELIVERY_TIMEOUT_MS = 5_000;
const DELIVERY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000];
const ATTRIBUTION_NAME = "scalmint";
const ATTRIBUTION_URL =
  "http://scalmint-attribution.invalid/api/webhooks/paystack";

type PaystackBody = {
  event?: string;
  data?: { reference?: string | null };
};

type Target = { name: string; url: string; secret: string };
type DeliveryResult = { name: string; ok: boolean };

function paystackSignatureValid(
  raw: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const candidates =
    process.env.NODE_ENV === "production"
      ? [process.env.PAYSTACK_SECRET_KEY]
      : [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_TEST_SECRET_KEY];
  const secrets = candidates.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (secrets.length === 0) return false;
  const received = Buffer.from(signature, "hex");
  return secrets.some((secret) => {
    const expected = Buffer.from(
      crypto.createHmac("sha512", secret).update(raw).digest("hex"),
      "hex",
    );
    return (
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received)
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function deliverTarget(
  target: Target,
  raw: string,
): Promise<DeliveryResult> {
  const headers = {
    "content-type": "application/json",
    "x-hub-signature": hubSignature(target.secret, raw),
  };
  for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers,
        body: raw,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      await res.body?.cancel();
      if (res.ok) return { name: target.name, ok: true };
      if (
        res.status >= 400 &&
        res.status < 500 &&
        res.status !== 408 &&
        res.status !== 429
      ) {
        console.error(
          `[hub] ${target.name} rejected with non-retryable status ${res.status}`,
        );
        return { name: target.name, ok: false };
      }
      console.warn(
        `[hub] ${target.name} attempt ${attempt}: status ${res.status}`,
      );
    } catch (err) {
      const detail =
        err instanceof Error ? `${err.name}: ${err.message}` : "fetch error";
      console.warn(`[hub] ${target.name} attempt ${attempt}: ${detail}`);
    }
    if (attempt < DELIVERY_ATTEMPTS) await sleep(RETRY_DELAYS_MS[attempt - 1]);
  }
  console.error(
    `[hub] ${target.name} delivery failed after ${DELIVERY_ATTEMPTS} attempts`,
  );
  return { name: target.name, ok: false };
}

async function deliverAttribution(raw: string): Promise<DeliveryResult> {
  const secret = process.env.AFFILIATE_HUB_SECRET;
  if (!secret) {
    console.error(
      "[hub] AFFILIATE_HUB_SECRET is not set; self-attribution cannot be verified",
    );
    return { name: ATTRIBUTION_NAME, ok: false };
  }
  try {
    const response = await attributionPOST(
      new NextRequest(ATTRIBUTION_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hub-signature": hubSignature(secret, raw),
        },
        body: raw,
      }),
    );
    if (response.ok) return { name: ATTRIBUTION_NAME, ok: true };
    console.error(
      `[hub] ${ATTRIBUTION_NAME} attribution failed: status ${response.status}`,
    );
    return { name: ATTRIBUTION_NAME, ok: false };
  } catch (err) {
    console.error(`[hub] ${ATTRIBUTION_NAME} attribution threw`, err);
    return { name: ATTRIBUTION_NAME, ok: false };
  }
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RAW_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const raw = await req.text();
  if (raw.length > MAX_RAW_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = req.headers.get("x-paystack-signature");
  if (!paystackSignatureValid(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: PaystackBody;
  try {
    body = JSON.parse(raw) as PaystackBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const event = body.event ?? "";
  const reference = body.data?.reference ?? null;
  if (!event || !reference) {
    const fallback = `${event || "unknown"}_${Date.now()}`;
    try {
      await db.webhookEvent.create({
        data: {
          provider: "paystack",
          event: event || "unknown",
          reference: hubReference(fallback),
          payload: raw,
          processed: true,
        },
      });
    } catch (err) {
      console.error("[hub] failed to record webhook event", err);
      return NextResponse.json(
        { error: "dedupe store unavailable" },
        { status: 500 },
      );
    }
    console.warn(
      `[hub] event ${event || "unknown"} has no reference; stored, not forwarded`,
    );
    return NextResponse.json({ ok: true, forwarded: false });
  }

  const key = hubReference(reference);
  try {
    await db.webhookEvent.create({
      data: {
        provider: "paystack",
        event,
        reference: key,
        payload: raw,
        processed: false,
      },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) {
      console.error("[hub] failed to record webhook event", err);
      return NextResponse.json(
        { error: "dedupe store unavailable" },
        { status: 500 },
      );
    }
    const existing = await db.webhookEvent.findUnique({
      where: { reference: key },
      select: { processed: true },
    });
    if (existing?.processed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (!existing) {
      console.error("[hub] duplicate reference has no stored event row", key);
      return NextResponse.json(
        { error: "dedupe store unavailable" },
        { status: 500 },
      );
    }
  }

  const all = resolveHubSubscribers();
  const targets = routeTargets(all, reference).map(({ name, url, secret }) => ({
    name,
    url,
    secret,
  }));

  const [subscriberResults, attributionResult] = await Promise.all([
    Promise.all(targets.map((target) => deliverTarget(target, raw))),
    deliverAttribution(raw),
  ]);

  const failed = [...subscriberResults, attributionResult]
    .filter((result) => !result.ok)
    .map((result) => result.name);
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "delivery_failed", failed },
      { status: 500 },
    );
  }

  try {
    await db.webhookEvent.update({
      where: { reference: key },
      data: { processed: true },
    });
  } catch (err) {
    console.error("[hub] failed to mark event processed", err);
    return NextResponse.json(
      { error: "dedupe store unavailable" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    modules: [...targets.map((t) => t.name), ATTRIBUTION_NAME],
  });
}
