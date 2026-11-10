import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { opsDb as db } from "@/lib/db";
import { writeAudit } from "@/lib/ops/audit";
import { requireOperator } from "@/lib/ops/guard";
import { rateLimit } from "@/lib/ops/rate-limit";
import { attachOpsCookie, signOpsSession } from "@/lib/auth/ops";

export async function POST(req: Request) {
  // Password changes are an account-security mutation every signed-in operator
  // may perform on their own account, so all four roles are allowed here.
  const guard = await requireOperator(req, {
    roles: ["OWNER", "ADMIN", "ANALYST", "SUPPORT"],
  });
  if (guard.error) return guard.error;
  const session = guard.session;

  const limited = rateLimit(`ops-passwd:${session.operatorId}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  // Passwords are compared byte-for-byte (bcrypt receives exactly what the
  // user typed), so unlike identifiers they must never be trimmed here.
  const body = (await req.json().catch(() => ({}))) as
    | { currentPassword?: unknown; newPassword?: unknown }
    | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (currentPassword.length > 128 || newPassword.length < 12 || newPassword.length > 128) {
    return NextResponse.json(
      { error: "A password of 12+ characters is required" },
      { status: 400 },
    );
  }

  const operator = await db.opsOperator.findUnique({ where: { id: session.operatorId } });
  if (!operator || operator.status !== "ACTIVE") {
    // The session may outlive a soft-disable; the guard verifies the signed
    // token only, so the current row state is checked here.
    return NextResponse.json({ error: "Session is invalid" }, { status: 401 });
  }

  if (operator.passwordHash === null) {
    // Fail loudly instead of feeding null into bcrypt.compare; the operator
    // must first set a password via the one-time reset flow.
    return NextResponse.json(
      { error: "Password not set. Use the one-time reset token from bootstrap." },
      { status: 409 },
    );
  }

  const currentOk = await bcrypt.compare(currentPassword, operator.passwordHash);
  if (!currentOk) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current password" },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);
  const updated = await db.$transaction(async (tx) => {
    // Persist the new hash and invalidate every session signed against an
    // older sessionVersion. Keeping the pre-read hash in the where clause
    // makes the write fail instead of silently clobbering a concurrent
    // password change; the audit is recorded in the same transaction.
    const updatedOperator = await tx.opsOperator.update({
      where: {
        id: session.operatorId,
        passwordHash: operator.passwordHash,
      },
      data: { passwordHash: hash, sessionVersion: { increment: 1 } },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: updatedOperator.id,
      action: "operator.password_changed",
      targetType: "OpsOperator",
      targetId: updatedOperator.id,
      req,
    });
    return updatedOperator;
  });

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
