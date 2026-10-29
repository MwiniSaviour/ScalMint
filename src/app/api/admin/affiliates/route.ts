import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { opsFromRequest } from "@/lib/auth/ops";

export async function GET(req: Request) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.affiliate.findMany();
  return NextResponse.json({
    affiliates: rows.map((row) => {
      const copy = { ...row } as Record<string, unknown>;
      delete copy.passwordHash;
      return copy;
    }),
  });
}
