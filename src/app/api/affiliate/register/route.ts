import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/auth/validation";
import { generateAffiliateCode } from "@/lib/affiliate/referral";
import { attachSessionCookie } from "@/lib/auth/session";
import { signSession } from "@/lib/auth/token";
import type { AffiliateRow } from "@/lib/affiliate/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid application";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const { name, email, phone, password, ghanaCardId, payoutMethod, payoutAccount, payoutAccountName, bankCode } =
      parsed.data;

    const existing = await db.affiliate.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already registered. Sign in instead." }, { status: 409 });

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

    const token = await signSession({
      affiliateId: affiliate.id,
      code: affiliate.code,
      email: affiliate.email,
      name: affiliate.name,
    });
    const res = NextResponse.json(
      { ok: true, code: affiliate.code, id: affiliate.id, token },
      { status: 201 },
    );
    attachSessionCookie(res, token, req);
    return res;
  } catch (err) {
    console.error("[affiliate/register]", err);
    const message = err instanceof Error ? err.message : "Unable to create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
