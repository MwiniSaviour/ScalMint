import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { opsDb as db } from "@/lib/db";
import { hashToken } from "@/lib/ops/crypto";
import { writeAudit } from "@/lib/ops/audit";
import { assertCsrf } from "@/lib/ops/csrf";
import { attachOpsCookie, signOpsSession } from "@/lib/auth/ops";

export async function POST(req: Request) {
  const csrf = assertCsrf(req);
  if (csrf) return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token || password.length < 12) {
    return NextResponse.json({ error: "Token and a password of 12+ characters are required" }, { status: 400 });
  }
  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Reset token is invalid or expired" }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 12);
  const operator = await db.$transaction(async (tx: any) => {
    await tx.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return tx.opsOperator.update({
      where: { id: row.operatorId },
      data: { passwordHash: hash, sessionVersion: { increment: 1 }, status: "ACTIVE" },
    });
  });
  await writeAudit(db, {
    actorType: "OPERATOR",
    actorId: operator.id,
    action: "operator.password_reset",
    targetType: "OpsOperator",
    targetId: operator.id,
    req,
  });
  const jwt = await signOpsSession({
    operatorId: operator.id,
    email: operator.email,
    name: operator.name,
    role: operator.role,
    sessionVersion: operator.sessionVersion,
  });
  const res = NextResponse.json({ ok: true });
  attachOpsCookie(res, jwt, req);
  return res;
}
