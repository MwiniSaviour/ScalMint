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
    id?: unknown;
    slug?: unknown;
    commissionRate?: unknown;
    commissionCap?: unknown;
    cookieDays?: unknown;
    minPayout?: unknown;
    status?: unknown;
  };
  const id = typeof body.id === "string" && body.id ? body.id : null;
  const slug = typeof body.slug === "string" && body.slug ? body.slug : null;
  if (!id && !slug) {
    return NextResponse.json({ error: "id or slug is required" }, { status: 400 });
  }
  if (body.status !== undefined && !isProductStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.commissionRate !== undefined && (!Number.isInteger(body.commissionRate) || (body.commissionRate as number) < 0)) {
    return NextResponse.json({ error: "commissionRate must be a non-negative integer" }, { status: 400 });
  }
  if (body.commissionCap !== undefined && body.commissionCap !== null && (!Number.isInteger(body.commissionCap) || (body.commissionCap as number) < 0)) {
    return NextResponse.json({ error: "commissionCap must be null or a non-negative integer" }, { status: 400 });
  }
  if (body.cookieDays !== undefined && (!Number.isInteger(body.cookieDays) || (body.cookieDays as number) < 1 || (body.cookieDays as number) > 365)) {
    return NextResponse.json({ error: "cookieDays must be an integer between 1 and 365" }, { status: 400 });
  }
  if (body.minPayout !== undefined && (!Number.isInteger(body.minPayout) || (body.minPayout as number) < 0)) {
    return NextResponse.json({ error: "minPayout must be a non-negative integer" }, { status: 400 });
  }
  const existing = await db.product.findUnique({
    where: id ? { id } : { slug: slug! },
    select: { id: true, commissionType: true },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (
    body.commissionRate !== undefined &&
    existing.commissionType !== "FLAT_CPA" &&
    (body.commissionRate as number) > 10_000
  ) {
    return NextResponse.json({ error: "Percent commissionRate is basis points and cannot exceed 10000" }, { status: 400 });
  }
  try {
    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: existing.id },
        data: {
          ...(body.commissionRate !== undefined ? { commissionRate: body.commissionRate as number } : {}),
          ...(body.commissionCap !== undefined ? { commissionCap: body.commissionCap as number | null } : {}),
          ...(body.cookieDays !== undefined ? { cookieDays: body.cookieDays as number } : {}),
          ...(body.minPayout !== undefined ? { minPayout: body.minPayout as number } : {}),
          ...(isProductStatus(body.status) ? { status: body.status } : {}),
        },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "product.update",
        targetType: "Product",
        targetId: updated.id,
        meta: body as Record<string, string | number | null | undefined>,
        req,
      });
      return updated;
    });
    return NextResponse.json({ product });
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code : undefined;
    if (code === "P2025") return NextResponse.json({ error: "Product not found" }, { status: 404 });
    throw err;
  }
}
