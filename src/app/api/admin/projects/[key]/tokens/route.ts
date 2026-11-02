import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { projectByKey, ScopeError } from "@/lib/ops/scope";
import { hashToken, randomToken } from "@/lib/ops/crypto";
import { writeAudit } from "@/lib/ops/audit";

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const { key } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; scopes?: string[] };
  try {
    const project = await projectByKey(key);
    const raw = `ops_${randomToken(24)}`;
    const scopes = (body.scopes?.length ? body.scopes : ["INGEST_WRITE"]).filter(
      (s) => s === "INGEST_WRITE" || s === "ENTITY_READ",
    );
    const token = await db.$transaction(async (tx: any) => {
      const created = await tx.projectServiceToken.create({
        data: {
          projectId: project.id,
          name: String(body.name ?? "Ingest").slice(0, 80),
          tokenHash: hashToken(raw),
          tokenPrefix: raw.slice(0, 8),
          scopes,
        },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "token.create",
        projectId: project.id,
        targetType: "ProjectServiceToken",
        targetId: created.id,
        meta: { scopes, prefix: created.tokenPrefix },
        req,
      });
      return created;
    });
    return NextResponse.json({
      token: { id: token.id, prefix: token.tokenPrefix, scopes: token.scopes, secret: raw },
      warning: "This secret is shown once. Store it on the product; the console keeps only a hash.",
    });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
