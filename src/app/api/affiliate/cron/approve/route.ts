import { NextResponse } from "next/server";
import { approveDueConversions } from "@/lib/affiliate/cron";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await approveDueConversions();
  return NextResponse.json({ ok: true, ...res });
}

export async function POST(req: Request) {
  return GET(req);
}
