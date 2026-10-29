import { SignJWT, jwtVerify } from "jose";
import { cookieOptions } from "@/lib/auth/token";
import type { NextResponse } from "next/server";

export const OPS_COOKIE = "ops_session";
export const OPS_MAX_AGE = 60 * 60 * 24 * 7;

export type OpsSession = {
  role: "ops";
  email: string;
  name: string;
};

function secret() {
  const s =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-only-auth-secret-change-me");
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to 32+ chars");
  return new TextEncoder().encode(s);
}

export function opsCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL ?? "ops@scalmint.com").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? "ScalMintOps2026",
    name: process.env.ADMIN_NAME ?? "ScalMint Ops",
  };
}

export async function signOpsSession(payload: OpsSession): Promise<string> {
  return new SignJWT({ role: "ops", email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OPS_MAX_AGE}s`)
    .sign(secret());
}

export async function verifyOpsSession(token: string): Promise<OpsSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "ops" || typeof payload.email !== "string") return null;
    return { role: "ops", email: payload.email, name: String(payload.name ?? "Ops") };
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

export async function opsFromRequest(req: Request): Promise<OpsSession | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${OPS_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(OPS_COOKIE.length + 1));
  return verifyOpsSession(token);
}
