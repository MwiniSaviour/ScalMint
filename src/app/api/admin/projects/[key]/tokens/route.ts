import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { projectByKey, ScopeError } from "@/lib/ops/scope";
import { hashToken, randomToken } from "@/lib/ops/crypto";
import { writeAudit } from "@/lib/ops/audit";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const { key } = await params;
  try {
    const project = await projectByKey(key);
    const tokens = await db.projectServiceToken.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, tokenPrefix: true, scopes: true, lastUsedAt: true, createdAt: true, revokedAt: true },
    });
    return NextResponse.json({ tokens });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const { key } = await params;
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  try {
    const project = await projectByKey(key);
    const existing = await db.projectServiceToken.findFirst({ where: { id: String(body.id ?? ""), projectId: project.id } });
    if (!existing) return NextResponse.json({ error: "Token not found" }, { status: 404 });
    const token = await db.$transaction(async (tx) => {
      const next = await tx.projectServiceToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "token.revoke",
        projectId: project.id,
        targetType: "ProjectServiceToken",
        targetId: existing.id,
        req,
      });
      return next;
    });
    return NextResponse.json({ token: { id: token.id, revokedAt: token.revokedAt } });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const { key } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; scopes?: string[] };
  try {
    const project = await projectByKey(key);
    const raw = `ops_${randomToken(24)}`;
    const requested = body.scopes?.length ? body.scopes : ["INGEST_WRITE"];
    const scopes = requested.filter((s) => s === "INGEST_WRITE" || s === "ENTITY_READ");
    if (scopes.length === 0 || scopes.length !== requested.length) {
      return NextResponse.json({ error: "scopes may only contain INGEST_WRITE or ENTITY_READ" }, { status: 400 });
    }
    const token = await db.$transaction(async (tx) => {
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
