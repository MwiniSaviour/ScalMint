import { after } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hubReference, resolveHubSubscribers, routeTargets } from "@/lib/hub/subscribers";
import { hubSignature } from "@/lib/hub/signature";
import { isUniqueViolation } from "@/lib/db-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RAW_BYTES = 1024 * 1024;
const DELIVERY_TIMEOUT_MS = 10_000;
const DELIVERY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 1000, 3000];

type PaystackBody = {
  event?: string;
  data?: { reference?: string | null };
};

function paystackSignatureValid(raw: string, signature: string | null): boolean {
  if (!signature) return false;
  const secrets = [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_TEST_SECRET_KEY].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (secrets.length === 0) return false;
  const received = Buffer.from(signature, "hex");
  return secrets.some((secret) => {
    const expected = Buffer.from(
      crypto.createHmac("sha512", secret).update(raw).digest("hex"),
      "hex",
    );
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function deliver(raw: string, targets: { name: string; url: string; secret: string }[]) {
  await Promise.allSettled(
    targets.map(async (target) => {
      const signature = hubSignature(target.secret, raw);
      const headers = {
        "content-type": "application/json",
        "x-hub-signature": signature,
      };
      for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt++) {
        try {
          const res = await fetch(target.url, {
            method: "POST",
            headers,
            body: raw,
            signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
          });
          if (res.ok) return;
          console.warn(`[hub] ${target.name} attempt ${attempt}: status ${res.status}`);
        } catch (err) {
          console.warn(
            `[hub] ${target.name} attempt ${attempt}: ${err instanceof Error ? err.name : "fetch error"}`,
          );
        }
        if (attempt < DELIVERY_ATTEMPTS) await sleep(RETRY_DELAYS_MS[attempt]);
      }
      console.error(`[hub] ${target.name} delivery failed after ${DELIVERY_ATTEMPTS} attempts`);
    }),
  );
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
      return NextResponse.json({ error: "dedupe store unavailable" }, { status: 500 });
    }
    console.warn(`[hub] event ${event || "unknown"} has no reference; stored, not forwarded`);
    return NextResponse.json({ ok: true, forwarded: false });
  }

  const key = hubReference(reference);
  try {
    await db.webhookEvent.create({
      data: { provider: "paystack", event, reference: key, payload: raw, processed: false },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[hub] failed to record webhook event", err);
    return NextResponse.json({ error: "dedupe store unavailable" }, { status: 500 });
  }

  const all = resolveHubSubscribers();
  const targets = routeTargets(all, reference).map(({ name, url, secret }) => ({ name, url, secret }));

  after(async () => {
    try {
      if (targets.length === 0) {
        await db.webhookEvent.update({ where: { reference: key }, data: { processed: true } });
        return;
      }
      await deliver(raw, targets);
      await db.webhookEvent.update({ where: { reference: key }, data: { processed: true } });
    } catch (err) {
      console.error("[hub] post-response processing failed", err);
    }
  });

  return NextResponse.json({ ok: true, modules: targets.map((t) => t.name) });
}
