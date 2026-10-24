import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth/validation";
import { attachSessionCookie } from "@/lib/auth/session";
import { signSession } from "@/lib/auth/token";
import type { AffiliateRow } from "@/lib/affiliate/types";

function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "error" in err && typeof (err as { error: unknown }).error === "string") {
    return (err as { error: string }).error;
  }
  return "Login failed";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const email = String(parsed.data.email).toLowerCase().trim();
    const aff = (await db.affiliate.findUnique({ where: { email } })) as AffiliateRow | null;
    if (!aff) {
      return NextResponse.json(
        {
          error:
            "No affiliate account for this email. Sign-in is only for people who already applied. Open Apply, submit once, then come back — same email and password.",
        },
        { status: 401 },
      );
    }

    const ok = await compare(parsed.data.password, aff.passwordHash);
    if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

    if (aff.status === "SUSPENDED") {
      return NextResponse.json({ error: "Account suspended. Contact support@scalmint.com" }, { status: 403 });
    }
    if (aff.status === "PENDING") {
      return NextResponse.json({ error: "Application pending approval (<24h). Check email." }, { status: 403 });
    }
    if (aff.status === "REJECTED") {
      return NextResponse.json({ error: "Application not approved" }, { status: 403 });
    }

    const token = await signSession({
      affiliateId: aff.id,
      code: aff.code,
      email: aff.email,
      name: aff.name,
    });
    const res = NextResponse.json({ ok: true, code: aff.code, token, name: aff.name });
    attachSessionCookie(res, token, req);
    return res;
  } catch (err) {
    console.error("[affiliate/login]", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
