import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { projectByKey, ScopeError } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN"] });
  if (gate.error) return gate.error;
  const { key } = await params;
  const body = (await req.json().catch(() => ({}))) as { confirm?: string; restore?: boolean };
  try {
    const project = await projectByKey(key);
    if (body.restore) {
      const updated = await db.$transaction(async (tx) => {
        const next = await tx.project.update({
          where: { id: project.id },
          data: { status: "ACTIVE", archivedAt: null },
        });
        await writeAudit(tx, {
          actorType: "OPERATOR",
          actorId: gate.session.operatorId,
          action: "project.restore",
          projectId: project.id,
          targetType: "Project",
          targetId: project.id,
          req,
        });
        return next;
      });
      return NextResponse.json({ project: updated });
    }
    if (body.confirm !== project.key) {
      return NextResponse.json({ error: "Type the project key to archive" }, { status: 400 });
    }
    const updated = await db.$transaction(async (tx) => {
      const next = await tx.project.update({
        where: { id: project.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "project.archive",
        projectId: project.id,
        targetType: "Project",
        targetId: project.id,
        req,
      });
      return next;
    });
    return NextResponse.json({ project: updated });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
