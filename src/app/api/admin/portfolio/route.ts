import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/ops/guard";
import { parseRange } from "@/lib/ops/range";
import { portfolioOverview } from "@/lib/ops/queries";
import { envelope } from "@/lib/ops/scope";

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range"), "30d");
  const data = await portfolioOverview(range);
  return NextResponse.json(envelope({ type: "portfolio", projectCount: data.projectCount }, data));
}
