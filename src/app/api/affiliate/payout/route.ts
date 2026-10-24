import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionFromRequest } from "@/lib/auth/token";
import { nanoid } from "nanoid";
import type { AffiliateRow, PayoutRow } from "@/lib/affiliate/types";

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affiliate = (await db.affiliate.findUnique({ where: { id: session.affiliateId } })) as AffiliateRow | null;
  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const availablePesewas = affiliate.totalEarned - affiliate.totalPaid;
  const threshold = affiliate.payoutMethod === "MOBILE_MONEY" ? 5000 : 10000;
  if (availablePesewas < threshold) {
    return NextResponse.json(
      { error: `Minimum GHS ${threshold / 100} not reached. Available GHS ${(availablePesewas / 100).toFixed(2)}` },
      { status: 400 },
    );
  }

  const pendingApproved = await db.conversion.count({
    where: { affiliateId: affiliate.id, status: "APPROVED", paidOut: false },
  });
  if (pendingApproved === 0) {
    return NextResponse.json({ error: "No approved conversions ready for payout" }, { status: 400 });
  }

  const reference = `aff_payout_${nanoid(12)}`;

  const payout = (await db.payout.create({
    data: {
      affiliateId: affiliate.id,
      amount: availablePesewas,
      method: affiliate.payoutMethod,
      reference,
      status: "QUEUED",
    },
  })) as PayoutRow;

  await db.conversion.updateMany({
    where: { affiliateId: affiliate.id, status: "APPROVED", paidOut: false },
    data: { payoutId: payout.id, status: "PAID", paidOut: true },
  });

  await db.affiliate.update({
    where: { id: affiliate.id },
    data: { totalPaid: { increment: availablePesewas } },
  });

  return NextResponse.json({ ok: true, reference, amount: availablePesewas, queued: true });
}
