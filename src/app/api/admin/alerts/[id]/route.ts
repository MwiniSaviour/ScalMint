import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN", "SUPPORT"] });
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { state?: "ACKED" | "RESOLVED"; note?: string };
  const existing = await db.alert.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  const alert = await db.$transaction(async (tx: any) => {
    const next = await tx.alert.update({
      where: { id },
      data: {
        state: body.state,
        ackedBy: body.state === "ACKED" ? gate.session.operatorId : existing.ackedBy,
        resolvedAt: body.state === "RESOLVED" ? new Date() : existing.resolvedAt,
        openDedupeKey: body.state === "RESOLVED" ? null : existing.openDedupeKey,
      },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: gate.session.operatorId,
      action: "alert.update",
      projectId: existing.projectId,
      targetType: "Alert",
      targetId: id,
      meta: body,
      req,
    });
    return next;
  });
  return NextResponse.json({ alert });
}
