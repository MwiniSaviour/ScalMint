import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER"] });
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { role?: string; status?: "ACTIVE" | "DISABLED" };
  const target = await db.opsOperator.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  if (target.role === "OWNER" && (body.status === "DISABLED" || (body.role && body.role !== "OWNER"))) {
    return NextResponse.json({ error: "OWNER cannot be removed or demoted by this action" }, { status: 403 });
  }
  const operator = await db.$transaction(async (tx: any) => {
    const next = await tx.opsOperator.update({
      where: { id },
      data: {
        role: body.role ? (body.role as never) : undefined,
        status: body.status,
        sessionVersion: { increment: 1 },
      },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: gate.session.operatorId,
      action: "operator.update",
      targetType: "OpsOperator",
      targetId: id,
      meta: body,
      req,
    });
    return next;
  });
  return NextResponse.json({
    operator: {
      id: operator.id,
      email: operator.email,
      name: operator.name,
      role: operator.role,
      status: operator.status,
    },
  });
}
