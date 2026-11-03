import { opsDb as db } from "@/lib/db";
import { availability, collectedInWindow, metricView, mrrAt, pesewasToMajor } from "@/lib/ops/metrics";
import { parseRange, rangeWindow } from "@/lib/ops/range";
import { projectHealthMap } from "@/lib/ops/queries";
import { jsonSafe } from "@/lib/ops/ensure";
import type { RangeKey } from "@/lib/ops/types";

export async function portfolioRollup(surface: string, rangeRaw: string | null) {
  const now = new Date();
  const range: RangeKey = parseRange(rangeRaw, surface === "revenue" ? "mtd" : "30d");
  const window = rangeWindow(range, now);
  const projects = await db.project.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });
  const ids = projects.map((p: { id: string }) => p.id);
  const health = await projectHealthMap(ids, now);
  const asOf = now.toISOString();

  if (surface === "health") {
    const checks = await db.projectCheck.findMany({ where: { projectId: { in: ids } } });
    const runs = await db.probeRun.findMany({
      where: { projectId: { in: ids }, startedAt: { gte: window.start, lt: window.end } },
      select: { projectId: true, ok: true, startedAt: true, latencyMs: true },
    });
    const alerts = await db.alert.findMany({
      where: { projectId: { in: ids }, state: { in: ["OPEN", "ACKED"] } },
    });
    const rows = projects.map((p: { id: string; key: string; name: string; kind: string; lifecycleStage: string }) => {
      const pRuns = runs.filter((r: { projectId: string }) => r.projectId === p.id);
      return {
        key: p.key,
        name: p.name,
        kind: p.kind,
        stage: p.lifecycleStage,
        status: health.get(p.id) ?? "UNKNOWN",
        checks: checks.filter((c: { projectId: string }) => c.projectId === p.id).length,
        openAlerts: alerts.filter((a: { projectId: string }) => a.projectId === p.id).length,
        availability: availability(pRuns),
      };
    });
    return jsonSafe({
      asOf,
      window: window.label,
      projectCount: projects.length,
      rows,
    });
  }

  if (surface === "analytics") {
    const tenants = await db.tenantRef.findMany({ where: { projectId: { in: ids } } });
    const ingest = await db.ingestEvent.findMany({
      where: { projectId: { in: ids }, receivedAt: { gte: window.start, lt: window.end } },
      select: { projectId: true, type: true },
    });
    const rows = projects.map((p: { id: string; key: string; name: string; kind: string; firstValueEvent: string | null }) => {
      const t = tenants.filter((x: { projectId: string }) => x.projectId === p.id);
      const newInWindow = t.filter(
        (x: { createdAt: Date }) => x.createdAt >= window.start && x.createdAt < window.end,
      ).length;
      const events = ingest.filter((e: { projectId: string }) => e.projectId === p.id);
      return {
        key: p.key,
        name: p.name,
        kind: p.kind,
        tenants: t.length,
        newTenants: newInWindow,
        ingestEvents: events.length,
        firstValueEvent: p.firstValueEvent,
        instrumented: events.length > 0 || t.length > 0,
      };
    });
    return jsonSafe({ asOf, window: window.label, projectCount: projects.length, rows });
  }

  if (surface === "revenue") {
    const facts = await db.subscriptionFact.findMany({ where: { projectId: { in: ids } } });
    const events = await db.revenueEvent.findMany({
      where: { projectId: { in: ids }, occurredAt: { gte: window.start, lt: window.end } },
    });
    const rows = projects.map((p: { id: string; key: string; name: string; currency: string; kind: string }) => {
      const pf = facts.filter((f: { projectId: string }) => f.projectId === p.id);
      const pe = events.filter((e: { projectId: string }) => e.projectId === p.id);
      const mrr = mrrAt(
        pf.map((f: { tenantRef: string; status: string; mrrMinor: bigint; periodStart: Date; periodEnd: Date }) => ({
          tenantRef: f.tenantRef,
          status: f.status as "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED",
          mrrMinor: Number(f.mrrMinor),
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
        })),
        now,
      );
      const cash = collectedInWindow(
        pe.map((e: { kind: string; amountMinor: bigint; occurredAt: Date }) => ({
          kind: e.kind as "PAYMENT" | "REFUND" | "FEE" | "ADJUSTMENT",
          amountMinor: Number(e.amountMinor),
          occurredAt: e.occurredAt,
        })),
        window.start,
        window.end,
      );
      return {
        key: p.key,
        name: p.name,
        kind: p.kind,
        currency: p.currency,
        mrr: pesewasToMajor(mrr.valueMinor),
        mrrQuality: mrr.quality,
        cash: pe.length ? pesewasToMajor(cash) : null,
        cashQuality: pe.length ? "OK" : "MISSING",
        events: pe.length,
        subscriptions: pf.length,
      };
    });
    const anyMrr = rows.some((r: { mrrQuality: string }) => r.mrrQuality === "OK");
    const anyCash = rows.some((r: { cashQuality: string }) => r.cashQuality === "OK");
    const metrics = [
      metricView({
        key: "portfolio_mrr",
        label: "Contracted MRR",
        value: anyMrr ? rows.reduce((n: number, r: { mrr: number | null }) => n + (r.mrr ?? 0), 0) : null,
        unit: "GHS",
        window: "as of now",
        source: "SubscriptionFact",
        asOf,
        quality: anyMrr ? "OK" : "MISSING",
        deltaPercent: null,
        target: null,
        formula: "Σ ACTIVE|PAST_DUE mrrMinor across projects. One-time cash is excluded.",
        decimals: 2,
      }),
      metricView({
        key: "portfolio_cash",
        label: "Cash collected",
        value: anyCash ? rows.reduce((n: number, r: { cash: number | null }) => n + (r.cash ?? 0), 0) : null,
        unit: "GHS",
        window: window.label,
        source: "RevenueEvent PAYMENT",
        asOf,
        quality: anyCash ? "OK" : "MISSING",
        deltaPercent: null,
        target: null,
        formula: "Σ PAYMENT amountMinor in the window. Shown beside MRR, never blended.",
        decimals: 2,
      }),
    ];
    return jsonSafe({ asOf, window: window.label, projectCount: projects.length, rows, metrics });
  }

  if (surface === "customers") {
    const tenants = await db.tenantRef.findMany({
      where: { projectId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const byProject = new Map<string, { key: string; name: string }>(
      projects.map((p: { id: string; key: string; name: string }) => [p.id, { key: p.key, name: p.name }]),
    );
    const rows = tenants.map(
      (t: {
        id: string;
        projectId: string;
        displayName: string;
        status: string;
        planKey: string | null;
        externalId: string;
        lastSeenAt: Date | null;
        region: string | null;
      }) => {
        const p = byProject.get(t.projectId);
        return {
          id: t.id,
          displayName: t.displayName,
          status: t.status,
          planKey: t.planKey,
          externalId: t.externalId,
          lastSeenAt: t.lastSeenAt?.toISOString() ?? null,
          region: t.region,
          projectKey: p?.key ?? "",
          projectName: p?.name ?? "",
        };
      },
    );
    return jsonSafe({ asOf, projectCount: projects.length, rows });
  }

  if (surface === "calendar") {
    const horizon = new Date(now.getTime() + 90 * 86400000);
    const assets = await db.asset.findMany({
      where: { projectId: { in: ids }, expiresAt: { not: null, lte: horizon } },
      orderBy: { expiresAt: "asc" },
    });
    const tasks = await db.opsTask.findMany({
      where: {
        projectId: { in: ids },
        dueAt: { not: null, lte: horizon },
        status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
      },
      orderBy: { dueAt: "asc" },
    });
    const byId = new Map<string, { key: string; name: string }>(
      projects.map((p: { id: string; key: string; name: string }) => [p.id, { key: p.key, name: p.name }]),
    );
    return jsonSafe({
      asOf,
      assets: assets.map((a: { id: string; projectId: string; name: string; kind: string; expiresAt: Date | null }) => ({
        ...a,
        projectKey: byId.get(a.projectId)?.key,
        projectName: byId.get(a.projectId)?.name,
      })),
      tasks: tasks.map((t: { id: string; projectId: string | null; title: string; dueAt: Date | null; priority: string }) => ({
        ...t,
        projectKey: t.projectId ? byId.get(t.projectId)?.key : null,
      })),
    });
  }

  throw new Error("Unknown surface");
}
