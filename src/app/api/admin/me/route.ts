import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";
import { attachOpsCookie, signOpsSession } from "@/lib/auth/ops";
import { rateLimit } from "@/lib/ops/rate-limit";

// Self-rename is self-scoped (target is always the signed-in operator), so every
// active role is allowed. The default guard allow-list is OWNER/ADMIN, which would
// incorrectly block ANALYST/SUPPORT from changing their own display name.
const SELF_RENAME_ROLES = ["OWNER", "ADMIN", "ANALYST", "SUPPORT"] as const;

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  return NextResponse.json({
    operator: {
      id: gate.session.operatorId,
      email: gate.session.email,
      name: gate.session.name,
      role: gate.session.role,
    },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireOperator(req, { write: true, roles: [...SELF_RENAME_ROLES] });
  if (gate.error) return gate.error;
  const limited = rateLimit(`ops-me:${gate.session.operatorId}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  if (typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const name = body.name.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: "name is too long (max 120 characters)" }, { status: 400 });
  }
  if (name === gate.session.name) {
    return NextResponse.json({
      operator: {
        id: gate.session.operatorId,
        email: gate.session.email,
        name: gate.session.name,
        role: gate.session.role,
      },
    });
  }
  const operator = await db.$transaction(async (tx) => {
    const updated = await tx.opsOperator.update({
      where: { id: gate.session.operatorId },
      data: { name },
      select: { id: true, email: true, name: true, role: true, sessionVersion: true },
    });
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: gate.session.operatorId,
      action: "operator.profile_update",
      targetType: "OpsOperator",
      targetId: gate.session.operatorId,
      meta: { from: gate.session.name, to: name },
      req,
    });
    return updated;
  });
  const res = NextResponse.json({ operator: { id: operator.id, email: operator.email, name: operator.name, role: operator.role } });
  // Re-sign the session cookie so the JWT's name claim stays current for this tab.
  const token = await signOpsSession({
    operatorId: operator.id,
    email: operator.email,
    name: operator.name,
    role: operator.role,
    sessionVersion: operator.sessionVersion,
  });
  attachOpsCookie(res, token, req);
  return res;
}
