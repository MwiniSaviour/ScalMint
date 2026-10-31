import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { opsFromRequest } from "@/lib/auth/ops";

const isProductStatus = (value: unknown): value is ProductStatus =>
  typeof value === "string" && (Object.values(ProductStatus) as string[]).includes(value);

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
  if (!body.id && !body.slug) {
    return NextResponse.json({ error: "id or slug is required" }, { status: 400 });
  }
  const status = body.status;
  if (status !== undefined && !isProductStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const product = await db.product.update({
      where: { id: body.id, slug: body.slug },
      data: {
        ...(body.commissionRate != null ? { commissionRate: Number(body.commissionRate) } : {}),
        ...(body.commissionCap !== undefined ? { commissionCap: body.commissionCap } : {}),
        ...(body.cookieDays != null ? { cookieDays: Number(body.cookieDays) } : {}),
        ...(body.minPayout != null ? { minPayout: Number(body.minPayout) } : {}),
        ...(status ? { status } : {}),
      },
    });
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}
