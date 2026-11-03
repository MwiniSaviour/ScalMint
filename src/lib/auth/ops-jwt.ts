import { SignJWT, jwtVerify } from "jose";
import type { OpsSession } from "@/lib/ops/types";
import { OPS_MAX_AGE } from "@/lib/auth/ops-cookie";

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
