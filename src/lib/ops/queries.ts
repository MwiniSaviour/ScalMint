// @ts-nocheck
import { opsDb as db } from "@/lib/db";
import { checkStatus, worstStatus } from "@/lib/ops/status";
import {
  availability,
  collectedInWindow,
  metricView,
  mrrAt,
  mrrWeightedAvailability,
  pesewasToMajor,
} from "@/lib/ops/metrics";
import type { HealthStatus, MetricView } from "@/lib/ops/types";
import { rangeWindow } from "@/lib/ops/range";
import type { RangeKey } from "@/lib/ops/types";

export async function projectHealthMap(projectIds: string[], now = new Date()): Promise<Map<string, HealthStatus>> {
  const checks = await db.projectCheck.findMany({
    where: { projectId: { in: projectIds } },
    include: { component: true },
  });
  const byProject = new Map<string, HealthStatus[]>();
  for (const check of checks) {
    const status = checkStatus({
      active: check.active,
      lastRunAt: check.lastRunAt,
      consecutiveFailures: check.consecutiveFailures,
      intervalSec: check.intervalSec,
      latencyMs: null,
      latencyBudgetMs: check.latencyBudgetMs,
      now,
    });
    const list = byProject.get(check.projectId) ?? [];
    list.push(status);
    byProject.set(check.projectId, list);
  }
  const out = new Map<string, HealthStatus>();
  for (const id of projectIds) {
    out.set(id, worstStatus(byProject.get(id) ?? []));
  }
  return out;
}

export async function lastIngestAt(projectId: string): Promise<Date | null> {
  const row = await db.ingestEvent.findFirst({
    where: { projectId, status: { in: ["ACCEPTED", "PROCESSED"] } },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true },
  });
  return row?.receivedAt ?? null;
}

export async function portfolioOverview(range: RangeKey) {
  const now = new Date();
  const window = rangeWindow(range, now);
  const mtd = rangeWindow("mtd", now);
  const projects = await db.project.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });
  const ids = projects.map((p) => p.id);
  const health = await projectHealthMap(ids, now);
  const facts = await db.subscriptionFact.findMany({ where: { projectId: { in: ids } } });
  const revenue = await db.revenueEvent.findMany({
    where: { projectId: { in: ids }, occurredAt: { gte: mtd.start, lt: mtd.end } },
  });
  const alerts = await db.alert.findMany({
    where: { projectId: { in: ids }, state: { in: ["OPEN", "ACKED"] } },
  });
  const tasks = await db.opsTask.findMany({
    where: {
      OR: [{ projectId: { in: ids } }, { projectId: null }],
      status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
    },
  });
  const trials = await db.tenantRef.findMany({
    where: { projectId: { in: ids }, status: "TRIAL" },
  });

  const asOf = now.toISOString();
  const rows = await Promise.all(
    projects.map(async (p) => {
      const pf = facts.filter((f) => f.projectId === p.id);
      const mrr = mrrAt(
        pf.map((f) => ({
          tenantRef: f.tenantRef,
          status: f.status,
          mrrMinor: Number(f.mrrMinor),
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
        })),
        now,
      );
      const pRuns = await db.probeRun.findMany({
        where: { projectId: p.id, startedAt: { gte: window.start, lt: window.end } },
        select: { ok: true },
      });
      const avail = availability(pRuns);
      const lastIngest = await lastIngestAt(p.id);
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        kind: p.kind,
        stage: p.lifecycleStage,
        status: health.get(p.id) ?? "UNKNOWN",
        mrrMinor: mrr.valueMinor,
        mrrQuality: mrr.quality,
        availability: avail,
        openP1: alerts.filter((a) => a.projectId === p.id && a.severity === "P1").length,
        ownerOperatorId: p.ownerOperatorId,
        lastIngestAt: lastIngest?.toISOString() ?? null,
      };
    }),
  );

  const collected = collectedInWindow(
    revenue.map((e) => ({ kind: e.kind, amountMinor: Number(e.amountMinor), occurredAt: e.occurredAt })),
    mtd.start,
    mtd.end,
  );
  const portfolioMrr = rows.reduce((n, r) => n + (r.mrrMinor ?? 0), 0);
  const anyMrr = rows.some((r) => r.mrrQuality === "OK");
  const weighted = mrrWeightedAvailability(
    rows.map((r) => ({ mrrMinor: r.mrrMinor ?? 0, ratio: r.availability })),
  );

  const overdueTasks = tasks.filter((t) => t.dueAt && t.dueAt < now);
  const p1 = alerts.filter((a) => a.severity === "P1" && a.state !== "RESOLVED");
  const p2 = alerts.filter((a) => a.severity === "P2" && a.state !== "RESOLVED");
  const trialsEnding = trials.filter((t) => {
    // without explicit trial end we cannot invent a date
    return false && t;
  });

  const metrics: MetricView[] = [
    metricView({
      key: "collected_mtd",
      label: "Collected MTD",
      value: pesewasToMajor(revenue.length ? collected : null),
      unit: "GHS",
      window: mtd.label,
      source: "RevenueEvent",
      asOf,
      quality: revenue.length ? "OK" : "MISSING",
      deltaPercent: null,
      target: null,
      formula: "Σ PAYMENT amountMinor in month-to-date. Cash collected, not contracted MRR.",
      decimals: 2,
    }),
    metricView({
      key: "cash_at_risk",
      label: "Cash at risk",
      value: null,
      unit: "GHS",
      window: "current",
      source: "SubscriptionFact PAST_DUE",
      asOf,
      quality: "MISSING",
      deltaPercent: null,
      target: null,
      formula: "Σ MRR of PAST_DUE facts at as-of. Not connected until subscription facts exist.",
    }),
    metricView({
      key: "mrr",
      label: "Contracted MRR",
      value: pesewasToMajor(anyMrr ? portfolioMrr : null),
      unit: "GHS",
      window: "as of now",
      source: "SubscriptionFact",
      asOf,
      quality: anyMrr ? "OK" : "MISSING",
      deltaPercent: null,
      target: null,
      formula: "Σ mrrMinor where periodStart ≤ asOf < periodEnd and status ACTIVE|PAST_DUE. Excludes one-time cash.",
      decimals: 2,
    }),
    metricView({
      key: "net_new_mrr",
      label: "Net new MRR",
      value: null,
      unit: "GHS",
      window: window.label,
      source: "SubscriptionFact movement",
      asOf,
      quality: "MISSING",
      deltaPercent: null,
      target: null,
      formula: "new + expansion − contraction − churn for the selected window.",
    }),
    metricView({
      key: "availability",
      label: "Portfolio availability",
      value: weighted == null ? null : weighted * 100,
      unit: "%",
      window: window.label,
      source: "ProbeRun, MRR-weighted",
      asOf,
      quality: weighted == null ? "MISSING" : "OK",
      deltaPercent: null,
      target: "99.9%",
      formula: "Σ (project availability × project MRR) / Σ project MRR. Projects with no MRR are excluded from the weight, never averaged.",
      decimals: 2,
    }),
  ];

  const attention = [
    { key: "p1", label: "Open P1 alerts", count: p1.length, href: "/admin/work?status=OPEN&priority=P1" },
    { key: "p2", label: "Open P2 alerts", count: p2.length, href: "/admin/work?status=OPEN&priority=P2" },
    { key: "overdue", label: "Overdue tasks", count: overdueTasks.length, href: "/admin/work?overdue=1" },
    { key: "trials", label: "Trials ending in 3 days", count: trialsEnding.length, href: "/admin/work?trials=1" },
  ];

  return {
    asOf,
    range,
    window: window.label,
    projectCount: projects.length,
    attention,
    metrics,
    projects: rows.sort((a, b) => {
      const order = { DOWN: 0, DEGRADED: 1, UNKNOWN: 2, UP: 3 };
      const d = order[a.status] - order[b.status];
      if (d !== 0) return d;
      return (b.mrrMinor ?? 0) - (a.mrrMinor ?? 0);
    }),
  };
}

export async function listProjectsForSwitcher(operatorId: string) {
  const projects = await db.project.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });
  const pins = await db.operatorProjectPin.findMany({ where: { operatorId } });
  const recents = await db.operatorProjectRecent.findMany({
    where: { operatorId },
    orderBy: { visitedAt: "desc" },
    take: 8,
  });
  const health = await projectHealthMap(projects.map((p) => p.id));
  const pinSet = new Set(pins.map((p) => p.projectId));
  const recentIds = recents.map((r) => r.projectId).filter((id) => !pinSet.has(id)).slice(0, 5);
  const map = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return null;
    return {
      id: p.id,
      key: p.key,
      name: p.name,
      kind: p.kind,
      status: health.get(p.id) ?? "UNKNOWN",
    };
  };
  return {
    pinned: pins.map((p) => map(p.projectId)).filter(Boolean),
    recent: recentIds.map(map).filter(Boolean),
    all: projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      kind: p.kind,
      status: health.get(p.id) ?? "UNKNOWN",
      domain: p.homepageUrl,
    })),
  };
}

export async function touchRecent(operatorId: string, projectId: string) {
  await db.operatorProjectRecent.upsert({
    where: { operatorId_projectId: { operatorId, projectId } },
    create: { operatorId, projectId },
    update: { visitedAt: new Date() },
  });
}
