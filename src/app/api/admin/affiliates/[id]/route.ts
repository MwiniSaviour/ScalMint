import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { opsFromRequest } from "@/lib/auth/ops";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const updated = await db.affiliate.update({ where: { id }, data: body });
    const affiliate = { ...updated } as Record<string, unknown>;
    delete affiliate.passwordHash;
    return NextResponse.json({ affiliate });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}
