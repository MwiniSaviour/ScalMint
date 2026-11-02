// @ts-nocheck
import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope, projectByKey, ScopeError } from "@/lib/ops/scope";
import { mrrAt, pesewasToMajor, collectedInWindow, metricView } from "@/lib/ops/metrics";
import { parseRange, rangeWindow } from "@/lib/ops/range";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const { key } = await params;
  const url = new URL(req.url);
  const surface = url.searchParams.get("name") ?? "overview";
  const range = parseRange(url.searchParams.get("range"), surface === "revenue" ? "mtd" : "30d");
  try {
    const project = await projectByKey(key);
    const scope = { type: "project" as const, projectId: project.id, projectKey: project.key };
    const now = new Date();
    const window = rangeWindow(range, now);

    if (surface === "customers") {
      const tenants = await db.tenantRef.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json(envelope(scope, { tenants, asOf: now.toISOString() }));
    }
    if (surface === "revenue") {
      const facts = await db.subscriptionFact.findMany({ where: { projectId: project.id } });
      const events = await db.revenueEvent.findMany({
        where: { projectId: project.id, occurredAt: { gte: window.start, lt: window.end } },
      });
      const mrr = mrrAt(
        facts.map((f) => ({
          tenantRef: f.tenantRef,
          status: f.status,
          mrrMinor: Number(f.mrrMinor),
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
        })),
        now,
      );
      const collected = collectedInWindow(
        events.map((e) => ({ kind: e.kind, amountMinor: Number(e.amountMinor), occurredAt: e.occurredAt })),
        window.start,
        window.end,
      );
      return NextResponse.json(
        envelope(scope, {
          facts,
          events,
          metrics: [
            metricView({
              key: "mrr",
              label: "Contracted MRR",
              value: pesewasToMajor(mrr.valueMinor),
              unit: project.currency,
              window: "as of now",
              source: "SubscriptionFact",
              asOf: now.toISOString(),
              quality: mrr.quality,
              deltaPercent: null,
              target: null,
              formula: "ACTIVE|PAST_DUE facts covering as-of. One-time payments never enter MRR.",
              decimals: 2,
            }),
            metricView({
              key: "cash",
              label: "Cash collected",
              value: pesewasToMajor(events.length ? collected : null),
              unit: project.currency,
              window: window.label,
              source: "RevenueEvent PAYMENT",
              asOf: now.toISOString(),
              quality: events.length ? "OK" : "MISSING",
              deltaPercent: null,
              target: null,
              formula: "Σ PAYMENT amountMinor in the window. Shown beside MRR, never blended.",
              decimals: 2,
            }),
          ],
        }),
      );
    }
    if (surface === "pipeline") {
      const leads = await db.lead.findMany({ where: { projectId: project.id }, orderBy: { updatedAt: "desc" }, take: 100 });
      return NextResponse.json(envelope(scope, { leads }));
    }
    if (surface === "assets") {
      const assets = await db.asset.findMany({ where: { projectId: project.id }, orderBy: { expiresAt: "asc" } });
      return NextResponse.json(envelope(scope, { assets }));
    }
    if (surface === "marketing") {
      const rows = await db.campaignAttribution.findMany({
        where: { projectId: project.id, occurredAt: { gte: window.start, lt: window.end } },
      });
      return NextResponse.json(envelope(scope, { attributions: rows, window: window.label }));
    }
    if (surface === "tasks") {
      const tasks = await db.opsTask.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json(envelope(scope, { tasks }));
    }
    return NextResponse.json({ error: "Unknown surface" }, { status: 400 });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
