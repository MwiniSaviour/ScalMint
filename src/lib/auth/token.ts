import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  affiliateId: string;
  code: string;
  email: string;
  name: string;
};

export const SESSION_COOKIE = "aff_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function getSecret(): Uint8Array {
  const s =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-only-auth-secret-change-me");
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to 32+ chars");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    affiliateId: payload.affiliateId,
    code: payload.code,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.affiliateId !== "string" || typeof payload.email !== "string") return null;
    return {
      affiliateId: payload.affiliateId,
      code: String(payload.code ?? ""),
      email: payload.email,
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export function cookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

export async function sessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const fromHeader = await verifySession(auth.slice(7).trim());
    if (fromHeader) return fromHeader;
  }
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  return verifySession(token);
}
