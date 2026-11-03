// @ts-nocheck
import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope, projectByKey, ScopeError } from "@/lib/ops/scope";
import { availability, mrrAt, pesewasToMajor, collectedInWindow, metricView } from "@/lib/ops/metrics";
import { parseRange, rangeWindow } from "@/lib/ops/range";
import { jsonSafe } from "@/lib/ops/ensure";
import { checkStatus } from "@/lib/ops/status";

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

    if (surface === "health") {
      const checks = await db.projectCheck.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "asc" },
      });
      const runs = await db.probeRun.findMany({
        where: { projectId: project.id, startedAt: { gte: window.start, lt: window.end } },
        orderBy: { startedAt: "asc" },
        take: 500,
      });
      const alerts = await db.alert.findMany({
        where: { projectId: project.id, state: { in: ["OPEN", "ACKED"] } },
        orderBy: { lastSeenAt: "desc" },
      });
      const series = bucketByDay(
        runs.map((r) => ({ at: r.startedAt, ok: r.ok, latencyMs: r.latencyMs })),
        window.start,
        window.end,
      );
      const checksOut = checks.map((c) => ({
        ...c,
        status: checkStatus({
          active: c.active,
          lastRunAt: c.lastRunAt,
          consecutiveFailures: c.consecutiveFailures,
          intervalSec: c.intervalSec,
          latencyMs: null,
          latencyBudgetMs: c.latencyBudgetMs,
          now,
        }),
      }));
      const avail = availability(runs);
      return NextResponse.json(
        jsonSafe(
          envelope(scope, {
            checks: checksOut,
            runs: runs.slice(-50),
            alerts,
            series,
            metrics: [
              metricView({
                key: "availability",
                label: "Probe availability",
                value: avail == null ? null : avail * 100,
                unit: "%",
                window: window.label,
                source: "ProbeRun",
                asOf: now.toISOString(),
                quality: runs.length ? "OK" : "MISSING",
                deltaPercent: null,
                target: "99.9%",
                formula: "successful probe runs / total probe runs in the window. No runs is No data, never 100%.",
                decimals: 2,
              }),
            ],
          }),
        ),
      );
    }

    if (surface === "analytics") {
      const tenants = await db.tenantRef.findMany({ where: { projectId: project.id } });
      const ingest = await db.ingestEvent.findMany({
        where: { projectId: project.id, receivedAt: { gte: window.start, lt: window.end } },
        orderBy: { receivedAt: "desc" },
        take: 200,
      });
      const snapshots = await db.metricSnapshot.findMany({
        where: { projectId: project.id, periodStart: { gte: window.start } },
        orderBy: { periodStart: "asc" },
        take: 200,
      });
      const newTenants = tenants.filter((t) => t.createdAt >= window.start && t.createdAt < window.end);
      const series = bucketByDay(
        ingest.map((e) => ({ at: e.receivedAt, ok: true, latencyMs: null })),
        window.start,
        window.end,
      );
      return NextResponse.json(
        jsonSafe(
          envelope(scope, {
            tenants,
            ingest,
            snapshots,
            series,
            metrics: [
              metricView({
                key: "tenants",
                label: "Known tenants",
                value: tenants.length ? tenants.length : null,
                unit: "accounts",
                window: "as of now",
                source: "TenantRef",
                asOf: now.toISOString(),
                quality: tenants.length ? "OK" : "MISSING",
                deltaPercent: null,
                target: null,
                formula: "Count of TenantRef rows. An empty directory is No data until a feed or operator records a tenant.",
                decimals: 0,
              }),
              metricView({
                key: "new_tenants",
                label: "New tenants",
                value: tenants.length ? newTenants.length : null,
                unit: "accounts",
                window: window.label,
                source: "TenantRef.createdAt",
                asOf: now.toISOString(),
                quality: tenants.length ? "OK" : "MISSING",
                deltaPercent: null,
                target: null,
                formula: "Tenants whose createdAt falls in the selected window.",
                decimals: 0,
              }),
              metricView({
                key: "ingest",
                label: "Ingested events",
                value: ingest.length ? ingest.length : null,
                unit: "events",
                window: window.label,
                source: "IngestEvent",
                asOf: now.toISOString(),
                quality: ingest.length ? "OK" : "UNKNOWN",
                deltaPercent: null,
                target: null,
                formula: "Accepted ingest events in the window. Zero events is Not connected, never a fake usage chart.",
                decimals: 0,
              }),
            ],
          }),
        ),
      );
    }

    if (surface === "customers") {
      const tenants = await db.tenantRef.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json(jsonSafe(envelope(scope, { tenants, asOf: now.toISOString() })));
    }

    if (surface === "revenue") {
      const facts = await db.subscriptionFact.findMany({ where: { projectId: project.id } });
      const events = await db.revenueEvent.findMany({
        where: { projectId: project.id, occurredAt: { gte: window.start, lt: window.end } },
        orderBy: { occurredAt: "desc" },
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
      const cashSeries = bucketSum(
        events
          .filter((e) => e.kind === "PAYMENT")
          .map((e) => ({ at: e.occurredAt, amount: Number(e.amountMinor) / 100 })),
        window.start,
        window.end,
      );
      return NextResponse.json(
        jsonSafe(
          envelope(scope, {
            facts,
            events,
            series: cashSeries,
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
        ),
      );
    }

    if (surface === "pipeline") {
      const leads = await db.lead.findMany({ where: { projectId: project.id }, orderBy: { updatedAt: "desc" }, take: 200 });
      return NextResponse.json(jsonSafe(envelope(scope, { leads })));
    }

    if (surface === "assets" || surface === "calendar") {
      const assets = await db.asset.findMany({ where: { projectId: project.id }, orderBy: { expiresAt: "asc" } });
      const tasks = await db.opsTask.findMany({
        where: { projectId: project.id, dueAt: { not: null } },
        orderBy: { dueAt: "asc" },
      });
      return NextResponse.json(jsonSafe(envelope(scope, { assets, tasks, window: window.label })));
    }

    if (surface === "marketing") {
      const rows = await db.campaignAttribution.findMany({
        where: { projectId: project.id, occurredAt: { gte: window.start, lt: window.end } },
        orderBy: { occurredAt: "desc" },
      });
      return NextResponse.json(jsonSafe(envelope(scope, { attributions: rows, window: window.label })));
    }

    if (surface === "tasks") {
      const tasks = await db.opsTask.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json(jsonSafe(envelope(scope, { tasks })));
    }

    return NextResponse.json({ error: "Unknown surface" }, { status: 400 });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

function bucketByDay(
  rows: { at: Date; ok: boolean; latencyMs: number | null }[],
  start: Date,
  end: Date,
) {
  const days: { day: string; ok: number; fail: number; samples: number }[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor < last) {
    const key = cursor.toISOString().slice(0, 10);
    const mine = rows.filter((r) => r.at.toISOString().slice(0, 10) === key);
    days.push({
      day: key,
      ok: mine.filter((r) => r.ok).length,
      fail: mine.filter((r) => !r.ok).length,
      samples: mine.length,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function bucketSum(rows: { at: Date; amount: number }[], start: Date, end: Date) {
  const days: { day: string; amount: number }[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor < last) {
    const key = cursor.toISOString().slice(0, 10);
    const amount = rows
      .filter((r) => r.at.toISOString().slice(0, 10) === key)
      .reduce((n, r) => n + r.amount, 0);
    days.push({ day: key, amount });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
