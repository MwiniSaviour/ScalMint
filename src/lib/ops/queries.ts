import { opsDb as db } from "@/lib/db";
import { checkStatus, worstStatus } from "@/lib/ops/status";
import {
  availability,
  collectedInWindow,
  metricView,
  mrrAt,
  mrrMovement,
  mrrWeightedAvailability,
  pesewasToMajor,
} from "@/lib/ops/metrics";
import type { HealthStatus, MetricView, RangeKey } from "@/lib/ops/types";
import { rangeWindow } from "@/lib/ops/range";

const RECURRING_BASES = new Set(["SUBSCRIPTION", "LICENCE", "RETAINER"]);

export async function latestLatencyByCheck(checkIds: string[]): Promise<Map<string, number | null>> {
  if (checkIds.length === 0) return new Map();
  const runs = await db.probeRun.findMany({
    where: { checkId: { in: checkIds } },
    orderBy: [{ checkId: "asc" }, { startedAt: "desc" }],
    distinct: ["checkId"],
    select: { checkId: true, latencyMs: true },
  });
  return new Map(runs.map((r) => [r.checkId, r.latencyMs]));
}

export async function projectHealthMap(projectIds: string[], now = new Date()): Promise<Map<string, HealthStatus>> {
  if (projectIds.length === 0) return new Map();
  const checks = await db.projectCheck.findMany({
    where: { projectId: { in: projectIds } },
    select: {
      id: true,
      projectId: true,
      active: true,
      lastRunAt: true,
      consecutiveFailures: true,
      intervalSec: true,
      latencyBudgetMs: true,
    },
  });
  const lastLatency = await latestLatencyByCheck(checks.map((c) => c.id));
  const byProject = new Map<string, HealthStatus[]>();
  for (const check of checks) {
    const status = checkStatus({
      active: check.active,
      lastRunAt: check.lastRunAt,
      consecutiveFailures: check.consecutiveFailures,
      intervalSec: check.intervalSec,
      latencyMs: lastLatency.get(check.id) ?? null,
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
  const horizon = new Date(now.getTime() + 30 * 86400000);
  const trialHorizon = new Date(now.getTime() + 3 * 86400000);

  const [runs, lastIngestRows, expiring, activity] = await Promise.all([
    db.probeRun.findMany({
      where: { projectId: { in: ids }, startedAt: { gte: window.start, lt: window.end } },
      select: { projectId: true, ok: true },
    }),
    db.ingestEvent.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, status: { in: ["ACCEPTED", "PROCESSED"] } },
      _max: { receivedAt: true },
    }),
    db.asset.findMany({
      where: { projectId: { in: ids }, expiresAt: { not: null, lte: horizon, gte: now } },
      select: { id: true },
    }),
    db.auditActivity.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 24 * 3600000) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, actorType: true, targetType: true, createdAt: true, projectId: true },
    }),
  ]);

  const runsByProject = new Map<string, { ok: boolean }[]>();
  for (const run of runs) {
    const list = runsByProject.get(run.projectId) ?? [];
    list.push({ ok: run.ok });
    runsByProject.set(run.projectId, list);
  }
  const lastIngest = new Map(lastIngestRows.map((row) => [row.projectId, row._max.receivedAt]));

  const factsByProject = new Map<string, typeof facts>();
  for (const fact of facts) {
    const list = factsByProject.get(fact.projectId) ?? [];
    list.push(fact);
    factsByProject.set(fact.projectId, list);
  }

  const asOf = now.toISOString();
  const rows = projects.map((p) => {
    const pf = factsByProject.get(p.id) ?? [];
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
    const avail = availability(runsByProject.get(p.id) ?? []);
    const ingestAt = lastIngest.get(p.id) ?? null;
    return {
      id: p.id,
      key: p.key,
      name: p.name,
      kind: p.kind,
      stage: p.lifecycleStage,
      revenueBasis: p.revenueBasis,
      status: health.get(p.id) ?? "UNKNOWN",
      mrrMinor: mrr.valueMinor,
      mrrQuality: mrr.quality,
      availability: avail,
      openP1: alerts.filter((a) => a.projectId === p.id && a.severity === "P1").length,
      ownerOperatorId: p.ownerOperatorId,
      lastIngestAt: ingestAt ? ingestAt.toISOString() : null,
    };
  });

  const collected = collectedInWindow(
    revenue.map((e) => ({ kind: e.kind, amountMinor: Number(e.amountMinor), occurredAt: e.occurredAt })),
    mtd.start,
    mtd.end,
  );

  const recurring = rows.filter((r) => RECURRING_BASES.has(r.revenueBasis));
  const covered = recurring.filter((r) => r.mrrQuality === "OK");
  const portfolioMrr = covered.reduce((n, r) => n + (r.mrrMinor ?? 0), 0);
  const mrrComplete = recurring.length > 0 && covered.length === recurring.length;
  const mrrCoverage = recurring.length > 0
    ? `${covered.length}/${recurring.length} recurring projects report`
    : "no recurring-revenue projects";
  const weighted = mrrWeightedAvailability(
    rows.map((r) => ({ mrrMinor: r.mrrMinor ?? 0, ratio: r.availability })),
  );

  const overdueTasks = tasks.filter((t) => t.dueAt && t.dueAt < now);
  const p1 = alerts.filter((a) => a.severity === "P1" && a.state !== "RESOLVED");
  const p2 = alerts.filter((a) => a.severity === "P2" && a.state !== "RESOLVED");
  const trialsEnding = new Map<string, Date>();
  for (const fact of facts) {
    if (fact.status !== "TRIALING") continue;
    if (fact.periodEnd < now || fact.periodEnd > trialHorizon) continue;
    trialsEnding.set(`${fact.projectId}:${fact.tenantRef}`, fact.periodEnd);
  }

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
      value: pesewasToMajor(
        facts.length
          ? facts
              .filter((f) => f.status === "PAST_DUE" && f.periodStart <= now && now < f.periodEnd)
              .reduce((n, f) => n + Number(f.mrrMinor), 0)
          : null,
      ),
      unit: "GHS",
      window: "as of now",
      source: "SubscriptionFact PAST_DUE",
      asOf,
      quality: facts.length ? "OK" : "MISSING",
      deltaPercent: null,
      target: null,
      formula: "Σ mrrMinor of PAST_DUE facts covering as-of. No facts is No data, not GH₵ 0.",
      decimals: 2,
    }),
    metricView({
      key: "mrr",
      label: "Contracted MRR",
      value: covered.length ? pesewasToMajor(portfolioMrr) : null,
      unit: "GHS",
      window: mrrComplete ? "as of now" : `as of now · ${mrrCoverage}`,
      source: "SubscriptionFact",
      asOf,
      quality: covered.length ? "OK" : "MISSING",
      deltaPercent: null,
      target: null,
      formula: `Σ mrrMinor where periodStart ≤ asOf < periodEnd and status ACTIVE|PAST_DUE, over recurring-revenue projects (${mrrCoverage}). Excludes one-time cash.`,
      decimals: 2,
    }),
    metricView({
      key: "net_new_mrr",
      label: "Net new MRR",
      value: pesewasToMajor(
        facts.length
          ? mrrMovement(
              facts.map((f) => ({
                tenantRef: f.tenantRef,
                status: f.status,
                mrrMinor: Number(f.mrrMinor),
                periodStart: f.periodStart,
                periodEnd: f.periodEnd,
              })),
              facts.map((f) => ({
                tenantRef: f.tenantRef,
                status: f.status,
                mrrMinor: Number(f.mrrMinor),
                periodStart: f.periodStart,
                periodEnd: f.periodEnd,
              })),
              window.start,
              now,
            ).netNew
          : null,
      ),
      unit: "GHS",
      window: window.label,
      source: "SubscriptionFact movement",
      asOf,
      quality: facts.length ? "OK" : "MISSING",
      deltaPercent: null,
      target: null,
      formula: "new + expansion − contraction − churn for the selected window. Facts are period-scoped, so start and as-of resolve against the same rows.",
      decimals: 2,
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
    { key: "trials", label: "Trials ending in 3 days", count: trialsEnding.size, href: "/admin/work?trials=1" },
    { key: "expiry", label: "Assets expiring in 30 days", count: expiring.length, href: "/admin/calendar" },
  ];

  return {
    asOf,
    range,
    window: window.label,
    projectCount: projects.length,
    attention,
    activity,
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
