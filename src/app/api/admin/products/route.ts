import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { opsFromRequest } from "@/lib/auth/ops";

export async function GET(req: Request) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ products: await db.product.findMany() });
}

export async function PATCH(req: Request) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    slug?: string;
    commissionRate?: number;
    commissionCap?: number | null;
    cookieDays?: number;
    minPayout?: number;
    status?: string;
  };
  try {
    const product = await db.product.update({
      where: { id: body.id, slug: body.slug },
      data: {
        ...(body.commissionRate != null ? { commissionRate: Number(body.commissionRate) } : {}),
        ...(body.commissionCap !== undefined ? { commissionCap: body.commissionCap } : {}),
        ...(body.cookieDays != null ? { cookieDays: Number(body.cookieDays) } : {}),
        ...(body.minPayout != null ? { minPayout: Number(body.minPayout) } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}
