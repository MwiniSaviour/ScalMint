import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/ops/guard";
import { envelope } from "@/lib/ops/scope";
import { portfolioRollup } from "@/lib/ops/rollups";

const SURFACES = new Set(["health", "analytics", "revenue", "customers", "calendar"]);

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  if (!SURFACES.has(name)) return NextResponse.json({ error: "Unknown surface" }, { status: 400 });
  const data = await portfolioRollup(name, url.searchParams.get("range"));
  const count = (data as { projectCount?: number }).projectCount ?? 0;
  return NextResponse.json(envelope({ type: "portfolio", projectCount: count }, data));
}
