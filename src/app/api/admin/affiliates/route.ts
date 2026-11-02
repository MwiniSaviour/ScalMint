import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const rows = await db.affiliate.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({
    scope: { type: "portfolio" },
    affiliates: rows.map((row: { passwordHash?: string }) => {
      const copy = { ...row } as Record<string, unknown>;
      delete copy.passwordHash;
      return copy;
    }),
  });
}
