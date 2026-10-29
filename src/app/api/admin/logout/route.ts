import { NextResponse } from "next/server";
import { OPS_COOKIE } from "@/lib/auth/ops";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.set(OPS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
