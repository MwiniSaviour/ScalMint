import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { projectByKey, ScopeError, envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";
import { projectHealthMap, lastIngestAt, recentLatencyByCheck, touchRecent } from "@/lib/ops/queries";
import { checkStatus, worstStatus } from "@/lib/ops/status";
import { mrrAt, pesewasToMajor, metricView } from "@/lib/ops/metrics";

const LIFECYCLE_STAGES = ["IDEA", "BUILD", "LAUNCH", "GROW", "MAINTAIN", "SUNSET"] as const;

const optionalText = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalHttpUrl = (value: unknown, field: string): { ok: true; value: string | null | undefined } | { ok: false; error: string } => {
  const text = optionalText(value);
  if (text === undefined || text === null) return { ok: true, value: text };
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, error: `${field} must be an http(s) URL` };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, error: `${field} must be a valid URL` };
  }
};

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
    const recentLatency = await recentLatencyByCheck(
      checks.map((ch) => ({ id: ch.id, intervalSec: ch.intervalSec })),
      now,
    );
    const componentStatus = components.map((c) => {
      const mine = checks.filter((ch) => ch.componentId === c.id);
      const statuses = mine.map((ch) =>
        checkStatus({
          active: ch.active,
          lastRunAt: ch.lastRunAt,
          consecutiveFailures: ch.consecutiveFailures,
          intervalSec: ch.intervalSec,
          recentLatencies: recentLatency.get(ch.id) ?? [],
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
              formula: "Sum of mrrMinor for ACTIVE|PAST_DUE facts covering as-of. One-time cash is excluded.",
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
    if (body.lifecycleStage != null) {
      const stage = String(body.lifecycleStage);
      if (!(LIFECYCLE_STAGES as readonly string[]).includes(stage)) {
        return NextResponse.json({ error: `Unknown lifecycle stage ${stage}` }, { status: 400 });
      }
    }
    const lifecycleStage =
      body.lifecycleStage == null ? undefined : (String(body.lifecycleStage) as (typeof LIFECYCLE_STAGES)[number]);
    const name = optionalText(body.name);
    if (name === null) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    const currencyInput = optionalText(body.currency);
    if (currencyInput === null) {
      return NextResponse.json({ error: "currency cannot be empty" }, { status: 400 });
    }
    const currency = currencyInput?.toUpperCase();
    if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "currency must be a 3-letter ISO code" }, { status: 400 });
    }
    const timezone = optionalText(body.timezone);
    if (timezone === null) {
      return NextResponse.json({ error: "timezone cannot be empty" }, { status: 400 });
    }
    if (timezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone });
      } catch {
        return NextResponse.json({ error: `Unknown timezone ${timezone}` }, { status: 400 });
      }
    }
    const homepage = optionalHttpUrl(body.homepageUrl, "homepageUrl");
    if (!homepage.ok) return NextResponse.json({ error: homepage.error }, { status: 400 });
    const support = optionalHttpUrl(body.supportUrl, "supportUrl");
    if (!support.ok) return NextResponse.json({ error: support.error }, { status: 400 });
    const docs = optionalHttpUrl(body.docsUrl, "docsUrl");
    if (!docs.ok) return NextResponse.json({ error: docs.error }, { status: 400 });
    const updated = await db.$transaction(async (tx) => {
      const next = await tx.project.update({
        where: { id: project.id },
        data: {
          name,
          description: optionalText(body.description),
          lifecycleStage,
          homepageUrl: homepage.value,
          firstValueEvent: optionalText(body.firstValueEvent),
          timezone,
          currency,
          supportUrl: support.value,
          docsUrl: docs.value,
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
