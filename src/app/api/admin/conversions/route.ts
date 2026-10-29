import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { opsFromRequest } from "@/lib/auth/ops";
import type { ConversionStatus } from "@/lib/affiliate/types";

export async function GET(req: Request) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversions = await db.conversion.findMany({});
  return NextResponse.json({ conversions });
}

export async function PATCH(req: Request) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: ConversionStatus };
  if (!body.id || !body.status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  const result = await db.conversion.updateMany({
    where: { id: { in: [body.id] } },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true, count: result.count });
}
