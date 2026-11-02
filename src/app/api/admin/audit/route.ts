import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope } from "@/lib/ops/scope";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const projectKey = url.searchParams.get("project");
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(100, Number(url.searchParams.get("take") ?? 50) || 50);
  const project = projectKey ? await db.project.findUnique({ where: { key: projectKey } }) : null;
  if (projectKey && !project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const rows = await db.auditActivity.findMany({
    where: project ? { projectId: project.id } : {},
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = rows.length > take ? rows[take]?.id : null;
  return NextResponse.json(
    envelope(project ? { type: "project", projectId: project.id, projectKey: project.key } : { type: "portfolio", projectCount: 0 }, {
      activities: rows.slice(0, take),
      nextCursor,
    }),
  );
}
