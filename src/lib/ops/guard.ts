import { NextResponse } from "next/server";
import { opsFromRequest } from "@/lib/auth/ops";
import { assertCsrf } from "@/lib/ops/csrf";
import type { OpsSession } from "@/lib/ops/types";

export type GuardOk = { session: OpsSession; error?: undefined };
export type GuardErr = { session?: undefined; error: NextResponse };

export async function requireOperator(
  req: Request,
  opts: { write?: boolean; roles?: OpsSession["role"][] } = {},
): Promise<GuardOk | GuardErr> {
  const csrf = assertCsrf(req);
  if (csrf) return { error: NextResponse.json({ error: "CSRF check failed" }, { status: 403 }) };

  let session: OpsSession | null = null;
  try {
    session = await opsFromRequest(req);
  } catch {
    return { error: NextResponse.json({ error: "Operator store unavailable" }, { status: 503 }) };
  }
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const write = opts.write ?? !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
  if (write) {
    const allowed = opts.roles ?? ["OWNER", "ADMIN"];
    if (!allowed.includes(session.role)) {
      return { error: NextResponse.json({ error: `Requires ${allowed.join(" or ")}` }, { status: 403 }) };
    }
  } else if (opts.roles && !opts.roles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
