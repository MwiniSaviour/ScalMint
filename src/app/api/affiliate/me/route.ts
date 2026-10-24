import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionFromRequest } from "@/lib/auth/token";
import type { AffiliateDashboard } from "@/lib/affiliate/types";

export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized", reason: "no_session" }, { status: 401 });
  }

  let raw = await db.affiliate.findUnique({
    where: { id: session.affiliateId },
    include: {
      conversions: { orderBy: { createdAt: "desc" }, take: 10, include: { product: true } },
      payouts: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!raw && session.email) {
    raw = await db.affiliate.findUnique({
      where: { email: session.email },
      include: {
        conversions: { orderBy: { createdAt: "desc" }, take: 10, include: { product: true } },
        payouts: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
  }
  if (!raw) {
    return NextResponse.json({ error: "Account not found", reason: "no_account" }, { status: 401 });
  }

  const affiliate = raw as AffiliateDashboard;
  return NextResponse.json({
    affiliate: {
      id: affiliate.id,
      name: affiliate.name,
      code: affiliate.code,
      email: affiliate.email,
      payoutMethod: affiliate.payoutMethod,
      payoutAccount: affiliate.payoutAccount,
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      totalEarned: affiliate.totalEarned,
      totalPaid: affiliate.totalPaid,
      conversions: affiliate.conversions ?? [],
      payouts: affiliate.payouts ?? [],
    },
  });
}
