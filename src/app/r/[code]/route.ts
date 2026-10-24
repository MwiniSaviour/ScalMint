import { NextResponse } from "next/server";
import { LIVE_PRODUCTS, PRODUCT_BY_SLUG } from "@/lib/affiliate/products";
import { normalizeRef } from "@/lib/affiliate/referral";

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const ref = normalizeRef(code.toUpperCase());
  const url = new URL(req.url);
  const slug = url.searchParams.get("p");
  const product = (slug && PRODUCT_BY_SLUG.get(slug as never)) || LIVE_PRODUCTS[0];

  if (product?.href && ref) {
    const dest = new URL(product.href);
    dest.searchParams.set("ref", ref);
    dest.searchParams.set("p", product.slug);
    return NextResponse.redirect(dest, 302);
  }

  const dest = new URL("/affiliate", url.origin);
  if (ref) dest.searchParams.set("ref", ref);
  return NextResponse.redirect(dest, 302);
}
