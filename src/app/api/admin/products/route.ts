import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";

type ProductStatus = "LIVE" | "COMING_SOON";

const isProductStatus = (value: unknown): value is ProductStatus =>
  value === "LIVE" || value === "COMING_SOON";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  return NextResponse.json({ products: await db.product.findMany() });
}

export async function PATCH(req: Request) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
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
    const product = await db.$transaction(async (tx: any) => {
      const updated = await tx.product.update({
        where: body.id ? { id: body.id } : { slug: body.slug! },
        data: {
          ...(body.commissionRate != null ? { commissionRate: Number(body.commissionRate) } : {}),
          ...(body.commissionCap !== undefined ? { commissionCap: body.commissionCap } : {}),
          ...(body.cookieDays != null ? { cookieDays: Number(body.cookieDays) } : {}),
          ...(body.minPayout != null ? { minPayout: Number(body.minPayout) } : {}),
          ...(status ? { status } : {}),
        },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "product.update",
        targetType: "Product",
        targetId: updated.id,
        meta: body,
        req,
      });
      return updated;
    });
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}
