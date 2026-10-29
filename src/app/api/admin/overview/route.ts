import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { opsFromRequest } from "@/lib/auth/ops";

export async function GET(req: Request) {
  if (!(await opsFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const affiliates = await db.affiliate.findMany();
  const conversions = await db.conversion.findMany({});
  const clicks = affiliates.reduce((n, a) => n + a.totalClicks, 0);
  const earned = affiliates.reduce((n, a) => n + a.totalEarned, 0);
  const now = new Date().toISOString();
  return NextResponse.json({
    dashboard_id: "scalmint-ops",
    generated_at: now,
    timezone: "Africa/Accra",
    metrics: [
      { id: "m-users", metric_key: "users", current_value: affiliates.length, previous_value: affiliates.length, delta_percent: 0, trend: "up", currency_code: null, display_format: "integer", period_label: "last_30d", created_at: now, updated_at: now },
      { id: "m-profit", metric_key: "profit", current_value: earned / 100, previous_value: earned / 100, delta_percent: 0, trend: "up", currency_code: "USD", display_format: "currency_compact", period_label: "last_30d", created_at: now, updated_at: now },
      { id: "m-orders", metric_key: "orders", current_value: conversions.length, previous_value: conversions.length, delta_percent: 0, trend: "up", currency_code: null, display_format: "integer", period_label: "last_30d", created_at: now, updated_at: now },
      { id: "m-views", metric_key: "views", current_value: clicks, previous_value: clicks, delta_percent: 0, trend: "up", currency_code: null, display_format: "compact", period_label: "last_7d", created_at: now, updated_at: now },
    ],
  });
}
