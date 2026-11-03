import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";
import { encryptSecret } from "@/lib/ops/crypto";
import { envelope } from "@/lib/ops/scope";
import { jsonSafe } from "@/lib/ops/ensure";

function hint(cipher: string) {
  return cipher.slice(-6);
}

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const projectKey = url.searchParams.get("project");
  const project = projectKey ? await db.project.findUnique({ where: { key: projectKey } }) : null;
  if (projectKey && !project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const rows = await db.alertChannel.findMany({
    where: project ? { projectId: project.id } : { projectId: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    jsonSafe(
      envelope(project ? { type: "project", projectId: project.id, projectKey: project.key } : { type: "portfolio", projectCount: 0 }, {
        channels: rows.map((c: { id: string; kind: string; severities: string[]; active: boolean; targetCipher: string; projectId: string | null }) => ({
          id: c.id,
          kind: c.kind,
          severities: c.severities,
          active: c.active,
          targetHint: hint(c.targetCipher),
          projectId: c.projectId,
        })),
      }),
    ),
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = String(body.kind ?? "");
  if (kind !== "EMAIL" && kind !== "WEBHOOK") return NextResponse.json({ error: "kind must be EMAIL or WEBHOOK" }, { status: 400 });
  const target = String(body.target ?? "").trim();
  if (!target) return NextResponse.json({ error: "target required" }, { status: 400 });
  if (kind === "EMAIL" && !target.includes("@")) return NextResponse.json({ error: "email target required" }, { status: 400 });
  if (kind === "WEBHOOK") {
    try {
      const u = new URL(target);
      if (u.protocol !== "https:") return NextResponse.json({ error: "webhook must be https" }, { status: 400 });
    } catch {
      return NextResponse.json({ error: "invalid webhook URL" }, { status: 400 });
    }
  }
  const severities = Array.isArray(body.severities) ? body.severities.map(String) : ["P1"];
  const projectKey = typeof body.projectKey === "string" ? body.projectKey : "";
  const project = projectKey ? await db.project.findUnique({ where: { key: projectKey } }) : null;
  if (projectKey && !project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const channel = await db.$transaction(async (tx: any) => {
    const created = await tx.alertChannel.create({
      data: {
        projectId: project?.id ?? null,
        kind,
        targetCipher: encryptSecret(target),
        severities,
        active: true,
      },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: gate.session.operatorId,
      action: "channel.create",
      projectId: project?.id ?? null,
      targetType: "AlertChannel",
      targetId: created.id,
      meta: { kind, severities },
      req,
    });
    return created;
  });
  return NextResponse.json({ channel: { id: channel.id, kind: channel.kind, severities: channel.severities, targetHint: hint(channel.targetCipher) } }, { status: 201 });
}
