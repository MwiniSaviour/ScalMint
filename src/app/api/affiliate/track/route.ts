import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeRef, hashIp } from "@/lib/affiliate/referral";
import type { AffiliateRow } from "@/lib/affiliate/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { ref?: string; productSlug?: string; referer?: string };
    const rawRef = body.ref ?? new URL(req.url).searchParams.get("ref");
    const ref = normalizeRef(rawRef);
    if (!ref) return NextResponse.json({ ok: false, error: "bad ref" }, { status: 200 });

    const affiliate = (await db.affiliate.findUnique({
      where: { code: ref },
      select: { id: true, status: true },
    })) as Pick<AffiliateRow, "id" | "status"> | null;
    if (!affiliate || affiliate.status !== "APPROVED") return NextResponse.json({ ok: false }, { status: 200 });

    const productSlug = typeof body.productSlug === "string" ? body.productSlug : new URL(req.url).searchParams.get("productSlug") ?? undefined;
    const referer =
      typeof body.referer === "string"
        ? body.referer.slice(0, 512)
        : req.headers.get("referer")?.slice(0, 512) ?? null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
    const ipHash = hashIp(ip);
    const ua = req.headers.get("user-agent")?.slice(0, 512) ?? null;
    const country = req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? null;

    await db.click.create({
      data: {
        affiliateId: affiliate.id,
        productSlug: productSlug?.slice(0, 64) ?? null,
        referer,
        ipHash,
        userAgent: ua,
        country,
      },
    });

    await db.affiliate
      .update({ where: { id: affiliate.id }, data: { totalClicks: { increment: 1 }, lastActiveAt: new Date() } })
      .catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[affiliate/track]", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
