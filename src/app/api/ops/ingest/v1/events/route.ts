import { NextResponse } from "next/server";
import { ingestBatch } from "@/lib/ops/ingest";
import { rateLimit } from "@/lib/ops/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = rateLimit(`ingest:${ip}`, 120, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }
  const raw = await req.text();
  const result = await ingestBatch(req, raw);
  if (result.status === 202) {
    return NextResponse.json(
      { schemaVersion: "1", accepted: result.accepted, duplicates: result.duplicates },
      { status: 202 },
    );
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
