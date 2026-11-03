import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";
import { hashToken, randomToken } from "@/lib/ops/crypto";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const operators = await db.opsOperator.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      sessionVersion: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json(envelope({ type: "portfolio", projectCount: 0 }, { operators }));
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER"] });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as { email?: string; name?: string; role?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = body.role === "ADMIN" || body.role === "ANALYST" || body.role === "SUPPORT" ? body.role : "SUPPORT";
  if (!email || !name) return NextResponse.json({ error: "email and name required" }, { status: 400 });
  const resetToken = randomToken(32);
  try {
    const operator = await db.$transaction(async (tx) => {
      const created = await tx.opsOperator.create({
        data: { email, name, role, status: "ACTIVE", passwordHash: null },
      });
      await tx.passwordReset.create({
        data: {
          operatorId: created.id,
          tokenHash: hashToken(resetToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "operator.create",
        targetType: "OpsOperator",
        targetId: created.id,
        meta: { email, role },
        req,
      });
      return created;
    });
    return NextResponse.json(
      {
        operator: { id: operator.id, email: operator.email, name: operator.name, role: operator.role },
        resetToken,
        warning: "Give this reset token to the operator once. It expires in 24 hours.",
      },
      { status: 201 },
    );
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Operator already exists" }, { status: 409 });
    }
    throw err;
  }
}
