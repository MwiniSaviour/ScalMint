import { cookies } from "next/headers";
import {
  cookieOptions,
  SESSION_COOKIE,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/token";
import type { NextResponse } from "next/server";

export type { SessionPayload };

function isSecureRequest() {
  return process.env.NODE_ENV === "production";
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(isSecureRequest()));
  return token;
}

export function attachSessionCookie(res: NextResponse, token: string, req?: Request) {
  const proto = req?.headers.get("x-forwarded-proto");
  const secure = proto === "https" || process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(secure));
  return res;
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}
