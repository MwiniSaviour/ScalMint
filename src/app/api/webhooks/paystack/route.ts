import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { calcCommission } from "@/lib/affiliate/referral";
import { verifyHubSignature } from "@/lib/hub/signature";
import { isUniqueViolation } from "@/lib/db-errors";

export const runtime = "nodejs";

const verifySignature = (payload: string, signature: string | null) => {
  if (!signature) return false;
  const secrets = [
    process.env.PAYSTACK_SECRET_KEY,
    process.env.PAYSTACK_TEST_SECRET_KEY,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);
  if (secrets.length === 0) return false;
  const expected = crypto
    .createHmac("sha512", secrets[0])
    .update(payload)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

interface PaystackBody {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    reason?: string;
    transfer_code?: string;
    customer?: { email?: string };
    metadata?: Record<string, unknown> | null;
  };
}

interface WebhookOutcome {
  ok: true;
  duplicate?: boolean;
  ignored?: string;
  reason?: string;
  credited?: number;
}

const json = (outcome: WebhookOutcome, status = 200) =>
  NextResponse.json(outcome, { status });

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const hubSig = req.headers.get("x-hub-signature");
  if (hubSig) {
    if (!verifyHubSignature(process.env.AFFILIATE_HUB_SECRET, raw, hubSig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (
    process.env.NODE_ENV === "production" &&
    !verifySignature(raw, req.headers.get("x-paystack-signature"))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: PaystackBody;
  try {
    body = JSON.parse(raw) as PaystackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const event = body.event ?? "unknown";
  const data = body.data ?? {};
  const reference = data.reference ?? `${event}_${Date.now()}`;

  if (reference.startsWith("NOVA-")) {
    return json({ ok: true, ignored: "nova_internal" });
  }

  try {
    await db.webhookEvent.create({
      data: { provider: "paystack", event, reference, payload: raw },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const existing = await db.webhookEvent.findUnique({ where: { reference } });
  if (existing?.processed) {
    return json({ ok: true, duplicate: true });
  }

  const markProcessed = () =>
    db.webhookEvent.update({ where: { reference }, data: { processed: true } });

  if (event.startsWith("transfer.")) {
    const payout = await db.payout.findUnique({ where: { reference } });
    if (payout) {
      const status =
        event === "transfer.success"
          ? "SUCCESS"
          : event === "transfer.failed"
            ? "FAILED"
            : "REVERSED";
      await db.payout.update({
        where: { reference },
        data: {
          status,
          processedAt: new Date(),
          failureReason:
            status === "SUCCESS"
              ? null
              : typeof data.reason === "string"
                ? data.reason
                : null,
        },
      });
    } else {
      console.error(
        `Paystack transfer webhook for unknown payout ${reference}`,
      );
    }
    await markProcessed();
    return json({ ok: true });
  }

  if (event !== "charge.success") {
    await markProcessed();
    return json({ ok: true, ignored: event });
  }

  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  let affiliateCode = "";
  if (
    typeof meta.affiliate_code === "string" &&
    meta.affiliate_code.trim().length > 0
  ) {
    affiliateCode = meta.affiliate_code.trim().toUpperCase();
  } else if (typeof meta.ref === "string") {
    affiliateCode = meta.ref.trim().toUpperCase();
  }
  if (!affiliateCode) {
    console.error("Paystack charge without affiliate metadata", reference);
    await markProcessed();
    return json({ ok: true, reason: "no_affiliate" });
  }

  const affiliate = await db.affiliate.findUnique({
    where: { code: affiliateCode },
  });
  if (!affiliate) {
    console.error(
      `Paystack charge for unknown affiliate ${affiliateCode}`,
      reference,
    );
    await markProcessed();
    return json({ ok: true, reason: "affiliate_not_found" });
  }
  if (affiliate.status !== "APPROVED") {
    await markProcessed();
    return json({ ok: true, reason: "affiliate_not_approved" });
  }

  const slug =
    typeof meta.product_slug === "string" && meta.product_slug.trim().length > 0
      ? meta.product_slug.trim()
      : // Legacy OPERASCH payloads carry metadata.ref only; they must attribute to
        // Nova POS, not be dropped.
        "nova-pos";
  const product = await db.product.findUnique({ where: { slug } });
  if (!product) {
    console.error(`Paystack charge for unknown product ${slug}`, reference);
    await markProcessed();
    return json({ ok: true, reason: "product_not_found" });
  }
  if (product.status !== "LIVE") {
    await markProcessed();
    return json({ ok: true, reason: "product_not_live" });
  }

  const customerEmail = data.customer?.email?.trim().toLowerCase();
  if (!customerEmail) {
    await markProcessed();
    return json({ ok: true, reason: "skipped_no_email" });
  }

  const amount = typeof data.amount === "number" ? data.amount : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    await markProcessed();
    return json({ ok: true, reason: "invalid_amount" });
  }

  const currency = typeof data.currency === "string" ? data.currency : "GHS";
  const { commissionPesewas, capped } = calcCommission(product, amount);
  const isOneTime =
    product.commissionType === "PERCENT_ONE_TIME" ||
    product.commissionType === "FLAT_CPA";
  const isSelfReferral = customerEmail === affiliate.email.toLowerCase();

  const outcome = await db
    .$transaction(async (tx) => {
      if (!isSelfReferral) {
        const dupe = await tx.conversion.findFirst({
          where: { customerEmail, productId: product.id, isOneTime: true },
          select: { id: true },
        });
        if (dupe) {
          return {
            duplicateConversion: true,
            selfReferral: false,
            credited: false,
            conversionId: dupe.id,
          };
        }
      }
      const fraudFlags = [
        ...(isSelfReferral ? ["self_referral"] : []),
        ...(capped ? ["commission_capped"] : []),
      ];
      const conversion = await tx.conversion.create({
        data: {
          affiliateId: affiliate.id,
          productId: product.id,
          status: isSelfReferral ? "REJECTED" : "PENDING",
          customerEmail,
          customerRef: reference,
          amount,
          commissionAmount: fraudFlags.length > 0 ? 0 : commissionPesewas,
          currency,
          isOneTime,
          fraudFlags: JSON.stringify(fraudFlags),
        },
      });
      if (fraudFlags.length === 0) {
        await tx.affiliate.update({
          where: { id: affiliate.id },
          data: {
            totalConversions: { increment: 1 },
            totalEarned: { increment: commissionPesewas },
          },
        });
      }
      return {
        duplicateConversion: false,
        selfReferral: isSelfReferral,
        credited: fraudFlags.length === 0,
        conversionId: conversion.id,
      };
    })
    .catch((error) => {
      // Lost the one-time race. The transaction rolled back, so the event row is
      // still processed:false — the next delivery reprocesses and converges on the
      // pre-check path above. Do NOT mark processed here.
      if (isUniqueViolation(error)) {
        return null;
      }
      throw error;
    });

  if (outcome === null) {
    return json({ ok: true, reason: "duplicate_conversion" });
  }
  if (outcome.duplicateConversion) {
    await markProcessed();
    return json({ ok: true, reason: "duplicate_conversion" });
  }
  await markProcessed();
  return json({
    ok: true,
    credited: outcome.credited ? 1 : 0,
    ...(outcome.selfReferral ? { reason: "self_referral" } : {}),
  });
}
