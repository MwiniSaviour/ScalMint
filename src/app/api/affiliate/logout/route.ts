import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await destroySession();
  return NextResponse.redirect(new URL("/affiliate/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
