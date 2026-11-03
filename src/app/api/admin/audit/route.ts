import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope } from "@/lib/ops/scope";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const projectKey = url.searchParams.get("project");
  const action = url.searchParams.get("action");
  const actorType = url.searchParams.get("actor");
  const format = url.searchParams.get("format");
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(format === "csv" ? 1000 : 100, Number(url.searchParams.get("take") ?? 50) || 50);
  const project = projectKey ? await db.project.findUnique({ where: { key: projectKey } }) : null;
  if (projectKey && !project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const where = {
    ...(project ? { projectId: project.id } : {}),
    ...(action ? { action: { contains: action } } : {}),
    ...(actorType ? { actorType: actorType as never } : {}),
  };
  const rows = await db.auditActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor && format !== "csv" ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  if (format === "csv") {
    const header = "createdAt,actorType,actorId,action,targetType,targetId,projectId";
    const body = rows
      .slice(0, take)
      .map(
        (r: {
          createdAt: Date;
          actorType: string;
          actorId: string;
          action: string;
          targetType: string;
          targetId: string;
          projectId: string | null;
        }) =>
          [r.createdAt.toISOString(), r.actorType, r.actorId, r.action, r.targetType, r.targetId, r.projectId ?? ""].join(","),
      )
      .join("\n");
    return new NextResponse(`${header}\n${body}\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=audit.csv",
      },
    });
  }
  const nextCursor = rows.length > take ? rows[take]?.id : null;
  return NextResponse.json(
    envelope(project ? { type: "project", projectId: project.id, projectKey: project.key } : { type: "portfolio", projectCount: 0 }, {
      activities: rows.slice(0, take),
      nextCursor,
    }),
  );
}
