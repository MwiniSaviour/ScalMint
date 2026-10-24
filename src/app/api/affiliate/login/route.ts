import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth/validation";
import { createSession } from "@/lib/auth/session";
import type { AffiliateRow } from "@/lib/affiliate/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });

    const aff = (await db.affiliate.findUnique({ where: { email: parsed.data.email } })) as AffiliateRow | null;
    if (!aff) return NextResponse.json({ error: "No account with that email" }, { status: 401 });

    const ok = await compare(parsed.data.password, aff.passwordHash);
    if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

    if (aff.status === "SUSPENDED") return NextResponse.json({ error: "Account suspended. Contact support@scalmint.com" }, { status: 403 });
    if (aff.status === "PENDING") return NextResponse.json({ error: "Application pending approval (<24h). Check email." }, { status: 403 });
    if (aff.status === "REJECTED") return NextResponse.json({ error: "Application not approved" }, { status: 403 });

    await createSession({ affiliateId: aff.id, code: aff.code, email: aff.email, name: aff.name });
    return NextResponse.json({ ok: true, code: aff.code });
  } catch (err) {
    console.error("[affiliate/login]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
