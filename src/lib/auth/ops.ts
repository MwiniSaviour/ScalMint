import { SignJWT, jwtVerify } from "jose";
import { cookieOptions } from "@/lib/auth/token";
import type { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import type { OpsSession } from "@/lib/ops/types";

import { OPS_COOKIE, OPS_MAX_AGE } from "@/lib/auth/ops-cookie";
export { OPS_COOKIE, OPS_MAX_AGE };

function secret() {
  const s =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-only-auth-secret-change-me");
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to 32+ chars");
  return new TextEncoder().encode(s);
}

export async function signOpsSession(payload: OpsSession): Promise<string> {
  return new SignJWT({
    operatorId: payload.operatorId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OPS_MAX_AGE}s`)
    .sign(secret());
}

export async function verifyOpsJwt(token: string): Promise<OpsSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.operatorId !== "string" || typeof payload.email !== "string") return null;
    const role = payload.role;
    if (role !== "OWNER" && role !== "ADMIN" && role !== "ANALYST" && role !== "SUPPORT") return null;
    return {
      operatorId: payload.operatorId,
      email: payload.email,
      name: String(payload.name ?? "Ops"),
      role,
      sessionVersion: Number(payload.sessionVersion ?? 0),
    };
  } catch {
    return null;
  }
}

export function attachOpsCookie(res: NextResponse, token: string, req?: Request) {
  const proto = req?.headers.get("x-forwarded-proto");
  const secure = proto === "https" || process.env.NODE_ENV === "production";
  res.cookies.set(OPS_COOKIE, token, { ...cookieOptions(secure), maxAge: OPS_MAX_AGE });
  return res;
}

export function readOpsCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${OPS_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(OPS_COOKIE.length + 1));
}

export async function opsFromRequest(req: Request): Promise<OpsSession | null> {
  const token = readOpsCookie(req);
  if (!token) return null;
  const session = await verifyOpsJwt(token);
  if (!session) return null;
  const operator = await db.opsOperator.findUnique({ where: { id: session.operatorId } });
  if (!operator || operator.status !== "ACTIVE") return null;
  if (operator.sessionVersion !== session.sessionVersion) return null;
  return {
    operatorId: operator.id,
    email: operator.email,
    name: operator.name,
    role: operator.role,
    sessionVersion: operator.sessionVersion,
  };
}
