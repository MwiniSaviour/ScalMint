import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/token";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/affiliate/login", req.url));
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
