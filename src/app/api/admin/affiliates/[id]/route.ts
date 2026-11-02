// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";
type AffiliateStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

const STATUSES: AffiliateStatus[] = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !STATUSES.includes(body.status as AffiliateStatus)) {
    return NextResponse.json({ error: "Valid status required" }, { status: 400 });
  }
  try {
    const updated = await db.$transaction(async (tx: { affiliate: { update: Function }; auditActivity: { create: Function } }) => {
      const row = await tx.affiliate.update({ where: { id }, data: { status: body.status as AffiliateStatus } });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "affiliate.status",
        targetType: "Affiliate",
        targetId: id,
        meta: { status: body.status },
        req,
      });
      return row;
    });
    const affiliate = { ...updated } as Record<string, unknown>;
    delete affiliate.passwordHash;
    return NextResponse.json({ affiliate });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}
