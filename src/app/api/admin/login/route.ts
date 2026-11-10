import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { opsDb as db } from "@/lib/db";
import { attachOpsCookie, signOpsSession } from "@/lib/auth/ops";
import { rateLimit } from "@/lib/ops/rate-limit";
import { writeAudit } from "@/lib/ops/audit";
import { assertCsrf } from "@/lib/ops/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (process.env.NODE_ENV === "production" && forwardedProto !== "https") {
    return NextResponse.json({ error: "HTTPS required" }, { status: 403 });
  }

  const csrf = assertCsrf(req);
  if (csrf) return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = rateLimit(`ops-login:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const operator = await db.opsOperator.findUnique({ where: { email } });
  if (!operator || operator.status !== "ACTIVE") {
    return NextResponse.json({ error: "Invalid operator credentials" }, { status: 401 });
  }
  if (!operator.passwordHash) {
    return NextResponse.json(
      { error: "Password not set. Use the one-time reset token from bootstrap." },
      { status: 403 },
    );
  }
  const match = await bcrypt.compare(password, operator.passwordHash);
  if (!match) return NextResponse.json({ error: "Invalid operator credentials" }, { status: 401 });

  await db.opsOperator.update({ where: { id: operator.id }, data: { lastLoginAt: new Date() } });
  await writeAudit(db, {
    actorType: "OPERATOR",
    actorId: operator.id,
    action: "operator.login",
    targetType: "OpsOperator",
    targetId: operator.id,
    req,
  });

  const token = await signOpsSession({
    operatorId: operator.id,
    email: operator.email,
    name: operator.name,
    role: operator.role,
    sessionVersion: operator.sessionVersion,
  });
  const res = NextResponse.json({ ok: true, name: operator.name, role: operator.role });
  attachOpsCookie(res, token, req);
  return res;
}
