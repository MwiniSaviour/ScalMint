import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/auth/validation";
import { generateAffiliateCode } from "@/lib/affiliate/referral";
import { createSession } from "@/lib/auth/session";
import type { AffiliateRow } from "@/lib/affiliate/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json({ error: first ?? "Invalid application" }, { status: 400 });
    }
    const { name, email, phone, password, ghanaCardId, payoutMethod, payoutAccount, payoutAccountName, bankCode } = parsed.data;

    const existing = await db.affiliate.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const code = generateAffiliateCode();
    const passwordHash = await hash(password, 12);

    const affiliate = (await db.affiliate.create({
      data: {
        code,
        name,
        email,
        phone: phone || null,
        passwordHash,
        ghanaCardId: ghanaCardId || null,
        payoutMethod,
        payoutAccount,
        payoutAccountName: payoutAccountName || name,
        bankCode: bankCode || null,
        status: "APPROVED",
      },
    })) as AffiliateRow;

    await createSession({ affiliateId: affiliate.id, code: affiliate.code, email: affiliate.email, name: affiliate.name });

    return NextResponse.json({ ok: true, code: affiliate.code, id: affiliate.id }, { status: 201 });
  } catch (err) {
    console.error("[affiliate/register]", err);
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}
