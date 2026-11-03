import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";

const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED"] as const;
const PRIORITIES = ["P1", "P2", "P3"] as const;

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const projectKey = url.searchParams.get("project");
  const statusParam = url.searchParams.get("status");
  const priorityParam = url.searchParams.get("priority");
  const overdue = url.searchParams.get("overdue") === "1";
  const trialsOnly = url.searchParams.get("trials") === "1";
  const now = new Date();

  const status = statusParam && statusParam !== "all" && isOneOf(TASK_STATUSES, statusParam) ? statusParam : null;
  if (statusParam && statusParam !== "all" && !status) {
    return NextResponse.json({ error: `Unknown task status ${statusParam}` }, { status: 400 });
  }
  const priority = priorityParam && isOneOf(PRIORITIES, priorityParam) ? priorityParam : null;
  if (priorityParam && !priority) {
    return NextResponse.json({ error: `Unknown priority ${priorityParam}` }, { status: 400 });
  }

  const project = projectKey ? await db.project.findUnique({ where: { key: projectKey } }) : null;
  if (projectKey && !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const where: Prisma.OpsTaskWhereInput = {
    ...(project ? { projectId: project.id } : {}),
    ...(statusParam === "all" ? {} : status ? { status } : { status: { in: [...OPEN_STATUSES] } }),
    ...(priority ? { priority } : {}),
    ...(overdue ? { dueAt: { lt: now }, status: { in: [...OPEN_STATUSES] } } : {}),
  };

  const tasks = await db.opsTask.findMany({
    where,
    include: { project: { select: { key: true, name: true } } },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    take: 200,
  });
  const alerts = await db.alert.findMany({
    where: {
      state: { in: ["OPEN", "ACKED"] },
      ...(project ? { projectId: project.id } : {}),
      ...(priority ? { severity: priority } : {}),
    },
    include: { project: { select: { key: true, name: true } } },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
  });

  const trials = trialsOnly
    ? await db.subscriptionFact.findMany({
        where: {
          status: "TRIALING",
          periodEnd: { gte: now, lte: new Date(now.getTime() + 3 * 86400000) },
          ...(project ? { projectId: project.id } : {}),
        },
        include: { project: { select: { key: true, name: true } } },
        orderBy: { periodEnd: "asc" },
        take: 100,
      })
    : [];
  const projectCount = project ? 1 : await db.project.count({ where: { status: { not: "ARCHIVED" } } });

  return NextResponse.json(
    envelope(
      project
        ? { type: "project", projectId: project.id, projectKey: project.key }
        : { type: "portfolio", projectCount },
      { tasks, alerts, trials },
    ),
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN", "SUPPORT"] });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const priorityRaw = body.priority == null ? "P2" : String(body.priority);
  if (!isOneOf(PRIORITIES, priorityRaw)) {
    return NextResponse.json({ error: `Unknown priority ${priorityRaw}` }, { status: 400 });
  }
  let dueAt: Date | null = null;
  if (body.dueAt != null && String(body.dueAt).trim() !== "") {
    dueAt = new Date(String(body.dueAt));
    if (Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "dueAt is not a valid date" }, { status: 400 });
  }

  let projectId: string | null = null;
  if (typeof body.projectKey === "string" && body.projectKey.trim()) {
    const p = await db.project.findUnique({ where: { key: body.projectKey.trim() } });
    if (!p) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
    projectId = p.id;
  }

  let alertId: string | null = null;
  if (typeof body.alertId === "string" && body.alertId.trim()) {
    const alert = await db.alert.findUnique({ where: { id: body.alertId.trim() } });
    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    if (projectId && alert.projectId !== projectId) {
      return NextResponse.json({ error: "Alert belongs to a different project" }, { status: 400 });
    }
    projectId = alert.projectId;
    alertId = alert.id;
  }

  const task = await db.$transaction(async (tx) => {
    const created = await tx.opsTask.create({
      data: {
        title,
        description: body.description ? String(body.description) : null,
        projectId,
        priority: priorityRaw,
        dueAt,
        alertId,
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
