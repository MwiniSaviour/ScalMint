import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { calcCommission } from "@/lib/affiliate/referral";
import { verifyHubSignature } from "@/lib/hub/signature";
import { isUniqueViolation } from "@/lib/db-errors";
import type { AffiliateRow, ConversionRow, PayoutRow, ProductRow } from "@/lib/affiliate/types";

export const runtime = "nodejs";

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature) return false;
  const secrets = [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_TEST_SECRET_KEY].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (secrets.length === 0) return false;
  const received = Buffer.from(signature, "hex");
  return secrets.some((secret) => {
    const expected = Buffer.from(
      crypto.createHmac("sha512", secret).update(payload).digest("hex"),
      "hex",
    );
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });
}

type PaystackBody = {
  event: string;
  data: {
    reference?: string;
    amount?: number;
    currency?: string;
    transfer_code?: string;
    customer?: { email?: string };
    metadata?: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  const hubSig = req.headers.get("x-hub-signature");

  if (hubSig) {
    if (!verifyHubSignature(process.env.AFFILIATE_HUB_SECRET, raw, hubSig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" && !verifySignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: PaystackBody;
  try {
    body = JSON.parse(raw) as PaystackBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const event = body.event;
  const data = body.data;
  const reference = data.reference ?? `${event}_${Date.now()}`;

  if (String(reference).startsWith("NOVA-")) {
    return NextResponse.json({ ok: true, ignored: "nova" });
  }

  try {
    await db.webhookEvent.create({
      data: { provider: "paystack", event, reference: String(reference), payload: raw, processed: false },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[affiliate] failed to record webhook event", err);
    return NextResponse.json({ error: "dedupe store unavailable" }, { status: 500 });
  }

  if (event === "charge.success") {
    const meta = data.metadata ?? {};
    const affCode = (typeof meta.affiliate_code === "string" ? meta.affiliate_code : null) ?? (typeof meta.ref === "string" ? meta.ref : null);
    if (!affCode) {
      await db.webhookEvent.update({ where: { reference: String(reference) }, data: { processed: true } });
      return NextResponse.json({ ok: true, no_aff: true });
    }
    const affiliate = (await db.affiliate.findUnique({ where: { code: affCode } })) as AffiliateRow | null;
    if (!affiliate) {
      await db.webhookEvent.update({ where: { reference: String(reference) }, data: { processed: true } });
      return NextResponse.json({ ok: true, aff_not_found: true });
    }

    const slug = typeof meta.product_slug === "string" ? meta.product_slug : "nova-pos";
    const product = (await db.product.findUnique({ where: { slug } })) as ProductRow | null;
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 400 });

    const amountPesewas = typeof data.amount === "number" ? data.amount : 0;
    const { commissionPesewas } = calcCommission(
      { commissionType: product.commissionType, commissionRate: product.commissionRate, commissionCap: product.commissionCap },
      amountPesewas,
    );

    const customerEmail = data.customer?.email ?? null;
    const fraudFlags: string[] = [];
    if (customerEmail && customerEmail.toLowerCase() === affiliate.email.toLowerCase()) fraudFlags.push("self_referral");

    const conversion = (await db.conversion.create({
      data: {
        affiliateId: affiliate.id,
        productId: product.id,
        customerEmail,
        customerRef: String(data.reference ?? ""),
        amount: amountPesewas,
        commissionAmount: fraudFlags.length ? 0 : commissionPesewas,
        currency: data.currency ?? "GHS",
        status: fraudFlags.length ? "REJECTED" : "PENDING",
        fraudFlags: fraudFlags.length ? JSON.stringify(fraudFlags) : null,
      },
    })) as ConversionRow;

    if (fraudFlags.length === 0) {
      await db.affiliate.update({
        where: { id: affiliate.id },
        data: { totalConversions: { increment: 1 }, totalEarned: { increment: commissionPesewas } },
      });
    }

    await db.webhookEvent.update({ where: { reference: String(reference) }, data: { processed: true } });
    return NextResponse.json({ ok: true, conversion: conversion.id });
  }

  if (event === "transfer.success" || event === "transfer.failed" || event === "transfer.reversed") {
    const trRef = data.reference as string;
    const payout = (await db.payout.findUnique({ where: { reference: trRef } })) as PayoutRow | null;
    if (payout) {
      await db.payout.update({
        where: { id: payout.id },
        data: {
          status: event === "transfer.success" ? "SUCCESS" : event === "transfer.failed" ? "FAILED" : "REVERSED",
          transferCode: data.transfer_code ?? payout.transferCode,
          processedAt: new Date(),
          failureReason: event === "transfer.failed" ? JSON.stringify(data) : null,
        },
      });
    }
    await db.webhookEvent.update({ where: { reference: String(reference) }, data: { processed: true } });
    return NextResponse.json({ ok: true, payout: trRef });
  }

  await db.webhookEvent.update({ where: { reference: String(reference) }, data: { processed: true } });
  return NextResponse.json({ ok: true, ignored: event });
}
