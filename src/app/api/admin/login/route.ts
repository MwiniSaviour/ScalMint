import { NextResponse } from "next/server";
import { attachOpsCookie, opsCredentials, signOpsSession } from "@/lib/auth/ops";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const creds = opsCredentials();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (email !== creds.email || password !== creds.password) {
    return NextResponse.json({ error: "Invalid operator credentials" }, { status: 401 });
  }
  const token = await signOpsSession({ role: "ops", email: creds.email, name: creds.name });
  const res = NextResponse.json({ ok: true, name: creds.name });
  attachOpsCookie(res, token, req);
  return res;
}
