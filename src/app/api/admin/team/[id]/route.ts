import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";
import { createPasswordReset, supersedePendingResets } from "@/lib/ops/password-reset";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER"] });
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { role?: string; status?: "ACTIVE" | "DISABLED"; reset?: boolean };
  if (body.status != null && body.status !== "ACTIVE" && body.status !== "DISABLED") {
    return NextResponse.json({ error: "status must be ACTIVE or DISABLED" }, { status: 400 });
  }
  const target = await db.opsOperator.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  if (target.role === "OWNER" && (body.status === "DISABLED" || (body.role && body.role !== "OWNER"))) {
    return NextResponse.json({ error: "OWNER cannot be removed or demoted by this action" }, { status: 403 });
  }
  if (body.reset) {
    const resetToken = await db.$transaction(async (tx) => {
      await supersedePendingResets(tx, id);
      const { token } = await createPasswordReset(tx, id);
      await tx.opsOperator.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "operator.reset",
        targetType: "OpsOperator",
        targetId: id,
        req,
      });
      return token;
    });
    return NextResponse.json({ resetToken, warning: "Single-use, 24 hours. Give it once." });
  }
  const allowedRoles = ["ADMIN", "ANALYST", "SUPPORT"];
  if (body.role && target.role !== "OWNER" && !allowedRoles.includes(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const role = body.role && target.role !== "OWNER" ? (body.role as "ADMIN" | "ANALYST" | "SUPPORT") : undefined;
  const operator = await db.$transaction(async (tx) => {
    const next = await tx.opsOperator.update({
      where: { id },
      data: {
        role,
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
