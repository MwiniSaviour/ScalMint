// @ts-nocheck
import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { listProjectsForSwitcher } from "@/lib/ops/queries";
import { envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";
import { projectHealthMap } from "@/lib/ops/queries";

const KINDS = ["SAAS", "POS", "WEBSITE", "WEBAPP", "INTERNAL", "SERVICE"] as const;

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  if (url.searchParams.get("view") === "switcher") {
    const data = await listProjectsForSwitcher(gate.session.operatorId);
    return NextResponse.json(envelope({ type: "portfolio", projectCount: data.all.length }, data));
  }
  const rows = await db.project.findMany({ orderBy: { name: "asc" } });
  const health = await projectHealthMap(rows.map((p) => p.id));
  return NextResponse.json(
    envelope(
      { type: "portfolio", projectCount: rows.length },
      {
        projects: rows.map((p) => ({
          ...p,
          statusHealth: health.get(p.id) ?? "UNKNOWN",
        })),
      },
    ),
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = String(body.key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const name = String(body.name ?? "").trim();
  const kind = String(body.kind ?? "");
  const currency = String(body.currency ?? "GHS").toUpperCase();
  const timezone = String(body.timezone ?? "Africa/Accra");
  if (!key || !name || !KINDS.includes(kind as (typeof KINDS)[number])) {
    return NextResponse.json({ error: "key, name, kind, currency, and timezone are required" }, { status: 400 });
  }
  try {
    const project = await db.$transaction(async (tx: any) => {
      const created = await tx.project.create({
        data: {
          key,
          name,
          kind: kind as (typeof KINDS)[number],
          currency,
          timezone,
          ownerOperatorId: gate.session.operatorId,
          description: body.description ? String(body.description) : null,
          homepageUrl: body.homepageUrl ? String(body.homepageUrl) : null,
        },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "project.create",
        projectId: created.id,
        targetType: "Project",
        targetId: created.id,
        meta: { key, name, kind },
        req,
      });
      return created;
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Project key already exists" }, { status: 409 });
  }
}
