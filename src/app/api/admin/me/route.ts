import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/ops/guard";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  return NextResponse.json({
    operator: {
      id: gate.session.operatorId,
      email: gate.session.email,
      name: gate.session.name,
      role: gate.session.role,
    },
  });
}
