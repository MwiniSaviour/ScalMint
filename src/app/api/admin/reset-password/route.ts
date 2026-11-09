import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { opsDb as db } from "@/lib/db";
import { hashToken } from "@/lib/ops/crypto";
import { writeAudit } from "@/lib/ops/audit";
import { assertCsrf } from "@/lib/ops/csrf";
import { rateLimit } from "@/lib/ops/rate-limit";
import { attachOpsCookie, signOpsSession } from "@/lib/auth/ops";

export async function POST(req: Request) {
  const csrf = assertCsrf(req);
  if (csrf) return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });

  // The token is 256-bit, so guessing is not realistically feasible, but bound
  // request volume anyway: this is the only unauthenticated mutation on the ops
  // surface, and unknown/expired/used tokens must stay indistinguishable.
  // x-real-ip first (written by the proxy for the real client address); an
  // x-forwarded-for header can be spoofed, so it is only a fallback.
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  const limited = rateLimit(`ops-reset:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    token?: unknown;
    password?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || token.length > 128 || password.length < 12 || password.length > 128) {
    return NextResponse.json(
      { error: "Token and a password of 12+ characters are required" },
      { status: 400 },
    );
  }

  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Reset token is invalid or expired" }, { status: 400 });
  }

  const existing = await db.opsOperator.findUnique({ where: { id: row.operatorId } });
  if (!existing) {
    return NextResponse.json({ error: "Reset token is invalid or expired" }, { status: 400 });
  }
  if (existing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account is disabled" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    // Claim the token atomically: two concurrent requests cannot both win, and
    // the audit is recorded in the same transaction as the password change.
    const claim = await tx.passwordReset.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claim.count !== 1) return null;
    const operator = await tx.opsOperator.update({
      where: { id: row.operatorId },
      data: { passwordHash: hash, sessionVersion: { increment: 1 } },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: operator.id,
      action: "operator.password_reset",
      targetType: "OpsOperator",
      targetId: operator.id,
      req,
    });
    return operator;
  });
  if (!updated) {
    return NextResponse.json({ error: "Reset token is invalid or expired" }, { status: 400 });
  }

  const jwt = await signOpsSession({
    operatorId: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    sessionVersion: updated.sessionVersion,
  });
  const res = NextResponse.json({ ok: true });
  attachOpsCookie(res, jwt, req);
  return res;
}
