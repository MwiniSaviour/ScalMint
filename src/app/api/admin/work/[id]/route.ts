import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";

const STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN", "SUPPORT"] });
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string; cancelReason?: string };
  const existing = await db.opsTask.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (body.status && !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.status === "CANCELLED" && !String(body.cancelReason ?? "").trim()) {
    return NextResponse.json({ error: "Cancellation requires a reason" }, { status: 400 });
  }
  const task = await db.$transaction(async (tx: any) => {
    const next = await tx.opsTask.update({
      where: { id },
      data: {
        status: body.status as (typeof STATUSES)[number] | undefined,
        cancelReason: body.status === "CANCELLED" ? String(body.cancelReason) : undefined,
        closedAt: body.status === "DONE" || body.status === "CANCELLED" ? new Date() : undefined,
      },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: gate.session.operatorId,
      action: "task.update",
      projectId: existing.projectId,
      targetType: "OpsTask",
      targetId: id,
      meta: body,
      req,
    });
    return next;
  });
  return NextResponse.json({ task });
}
