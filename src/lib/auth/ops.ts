import { cookieOptions } from "@/lib/auth/token";
import type { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import type { OpsSession } from "@/lib/ops/types";

import { OPS_COOKIE, OPS_MAX_AGE } from "@/lib/auth/ops-cookie";
import { signOpsSession, verifyOpsJwt } from "@/lib/auth/ops-jwt";
export { OPS_COOKIE, OPS_MAX_AGE, signOpsSession, verifyOpsJwt };

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
