// @ts-nocheck
import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { projectByKey, ScopeError, envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";
import { projectHealthMap, lastIngestAt, touchRecent } from "@/lib/ops/queries";
import { checkStatus, worstStatus } from "@/lib/ops/status";
import { mrrAt, pesewasToMajor, metricView } from "@/lib/ops/metrics";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const { key } = await params;
  try {
    const project = await projectByKey(key);
    await touchRecent(gate.session.operatorId, project.id);
    const [health, ingest, facts, components, checks, alerts] = await Promise.all([
      projectHealthMap([project.id]),
      lastIngestAt(project.id),
      db.subscriptionFact.findMany({ where: { projectId: project.id } }),
      db.projectComponent.findMany({ where: { projectId: project.id } }),
      db.projectCheck.findMany({ where: { projectId: project.id } }),
      db.alert.findMany({ where: { projectId: project.id, state: { in: ["OPEN", "ACKED"] } } }),
    ]);
    const now = new Date();
    const componentStatus = components.map((c) => {
      const mine = checks.filter((ch) => ch.componentId === c.id);
      const statuses = mine.map((ch) =>
        checkStatus({
          active: ch.active,
          lastRunAt: ch.lastRunAt,
          consecutiveFailures: ch.consecutiveFailures,
          intervalSec: ch.intervalSec,
          latencyMs: null,
          latencyBudgetMs: ch.latencyBudgetMs,
          now,
        }),
      );
      return { ...c, status: worstStatus(statuses) };
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
    return NextResponse.json(
      envelope(
        { type: "project", projectId: project.id, projectKey: project.key },
        {
          project: {
            ...project,
            statusHealth: health.get(project.id) ?? "UNKNOWN",
            lastIngestAt: ingest?.toISOString() ?? null,
          },
          components: componentStatus,
          checks,
          openAlerts: alerts.length,
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
              formula: "Σ mrrMinor for ACTIVE|PAST_DUE facts covering as-of. One-time cash is excluded.",
              decimals: 2,
            }),
          ],
        },
      ),
    );
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const { key } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const project = await projectByKey(key);
    if ("key" in body) return NextResponse.json({ error: "Project key is immutable" }, { status: 400 });
    const updated = await db.$transaction(async (tx: any) => {
      const next = await tx.project.update({
        where: { id: project.id },
        data: {
          name: typeof body.name === "string" ? body.name : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
          lifecycleStage: typeof body.lifecycleStage === "string" ? (body.lifecycleStage as never) : undefined,
          homepageUrl: typeof body.homepageUrl === "string" ? body.homepageUrl : undefined,
          firstValueEvent: typeof body.firstValueEvent === "string" ? body.firstValueEvent : undefined,
          timezone: typeof body.timezone === "string" ? body.timezone : undefined,
          currency: typeof body.currency === "string" ? body.currency : undefined,
          supportUrl: typeof body.supportUrl === "string" ? body.supportUrl : undefined,
          docsUrl: typeof body.docsUrl === "string" ? body.docsUrl : undefined,
        },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "project.update",
        projectId: project.id,
        targetType: "Project",
        targetId: project.id,
        meta: body,
        req,
      });
      return next;
    });
    return NextResponse.json({ project: updated });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
