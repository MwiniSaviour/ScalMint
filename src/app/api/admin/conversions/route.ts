import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";
type ConversionStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

const STATUSES: ConversionStatus[] = ["PENDING", "APPROVED", "REJECTED", "PAID"];

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const conversions = await db.conversion.findMany({
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ conversions });
}

export async function PATCH(req: Request) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: ConversionStatus };
  if (!body.id || !body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }
  try {
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.conversion.update({
        where: { id: body.id },
        data: { status: body.status },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "conversion.status",
        targetType: "Conversion",
        targetId: body.id!,
        meta: { status: body.status },
        req,
      });
      return row;
    });
    return NextResponse.json({ ok: true, conversion: { id: updated.id, status: updated.status } });
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code : undefined;
    if (code === "P2025") return NextResponse.json({ error: "Conversion not found" }, { status: 404 });
    throw err;
  }
}
