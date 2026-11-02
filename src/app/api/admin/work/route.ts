import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const projectKey = url.searchParams.get("project");
  const status = url.searchParams.get("status");
  const overdue = url.searchParams.get("overdue") === "1";
  const project = projectKey ? await db.project.findUnique({ where: { key: projectKey } }) : null;
  const where = {
    ...(project ? { projectId: project.id } : {}),
    ...(status ? { status: status as never } : { status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] as const } }),
    ...(overdue ? { dueAt: { lt: new Date() } } : {}),
  };
  const tasks = await db.opsTask.findMany({
    where,
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    take: 100,
  });
  const alerts = await db.alert.findMany({
    where: {
      state: { in: ["OPEN", "ACKED"] },
      ...(project ? { projectId: project.id } : {}),
    },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
  });
  return NextResponse.json(
    envelope(project ? { type: "project", projectId: project.id, projectKey: project.key } : { type: "portfolio", projectCount: 0 }, {
      tasks,
      alerts,
    }),
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN", "SUPPORT"] });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  let projectId: string | null = null;
  if (typeof body.projectKey === "string") {
    const p = await db.project.findUnique({ where: { key: body.projectKey } });
    if (!p) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
    projectId = p.id;
  }
  const task = await db.$transaction(async (tx: any) => {
    const created = await tx.opsTask.create({
      data: {
        title,
        description: body.description ? String(body.description) : null,
        projectId,
        priority: (body.priority as "P1") ?? "P2",
        dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
        alertId: body.alertId ? String(body.alertId) : null,
        createdBy: gate.session.operatorId,
      },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: gate.session.operatorId,
      action: "task.create",
      projectId,
      targetType: "OpsTask",
      targetId: created.id,
      req,
    });
    return created;
  });
  return NextResponse.json({ task }, { status: 201 });
}
