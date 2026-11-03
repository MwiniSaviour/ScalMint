import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { writeAudit } from "@/lib/ops/audit";
import { assertPublicHttpUrl, ensureWebComponent, isCommandType, jsonSafe } from "@/lib/ops/ensure";
import { hashToken } from "@/lib/ops/crypto";
import { upsertExpiryAlert } from "@/lib/ops/expiry";

const TENANT_STATUSES = ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CHURNED", "ARCHIVED"] as const;
const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
const ASSET_KINDS = ["DOMAIN", "TLS", "HOSTING", "LICENCE", "API_KEY", "OTHER"] as const;
const REVENUE_KINDS = ["PAYMENT", "REFUND", "FEE", "ADJUSTMENT"] as const;
const SUB_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"] as const;
const HTTP_METHODS = ["GET", "HEAD", "POST"] as const;

function pickEnum<T extends readonly string[]>(values: T, raw: unknown, fallback: T[number], field: string): T[number] {
  if (raw == null || raw === "") return fallback;
  const value = String(raw);
  if (!(values as readonly string[]).includes(value)) throw new Error(`Invalid ${field} "${value}"`);
  return value as T[number];
}

function parseDate(raw: unknown, field: string, fallback?: Date): Date {
  if (raw == null || raw === "") {
    if (fallback) return fallback;
    throw new Error(`${field} is required`);
  }
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) throw new Error(`${field} is not a valid date`);
  return date;
}

function numberInRange(raw: unknown, fallback: number, min: number, max: number, field: string): number {
  const value = Number(raw ?? fallback);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN", "SUPPORT"] });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const type = String(body.type ?? "");
  if (!isCommandType(type)) {
    return NextResponse.json({ error: `Unknown command ${type}` }, { status: 400 });
  }
  const supportCommands = new Set(["check.test", "lead.create", "lead.move"]);
  if (gate.session.role === "SUPPORT" && !supportCommands.has(type)) {
    return NextResponse.json({ error: "Requires OWNER or ADMIN" }, { status: 403 });
  }
  try {
    if (type === "check.test") {
      const result = await runCheckTest(body, gate.session.operatorId, req);
      return NextResponse.json(jsonSafe(result));
    }
    const result = await db.$transaction(async (tx) => {
      const out = await run(tx, type, body, gate.session.operatorId);
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: type,
        projectId: out.projectId ?? null,
        targetType: out.targetType,
        targetId: out.targetId,
        meta: { type },
        req,
      });
      return out;
    });
    return NextResponse.json(jsonSafe(result), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Command failed" }, { status: 400 });
  }
}

async function projectOrThrow(tx: Prisma.TransactionClient, key: string) {
  const project = await tx.project.findUnique({ where: { key } });
  if (!project) throw new Error("Project not found");
  if (project.status === "ARCHIVED") throw new Error("Project is archived");
  return project;
}

async function run(
  tx: Prisma.TransactionClient,
  type: string,
  body: Record<string, unknown>,
  operatorId: string,
) {
  const key = String(body.projectKey ?? "");

  if (type === "check.create") {
    const project = await projectOrThrow(tx, key);
    const component = await ensureWebComponent(tx, project.id);
    const requestedKey = String(body.key ?? "http-home")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const checkKey = requestedKey || `http-${nanoid(6)}`;
    const targetUrl = assertPublicHttpUrl(String(body.targetUrl ?? ""));
    const duplicate = await tx.projectCheck.findUnique({
      where: { projectId_key: { projectId: project.id, key: checkKey } },
    });
    if (duplicate) throw new Error(`Check key "${checkKey}" already exists on this project`);
    const created = await tx.projectCheck.create({
      data: {
        projectId: project.id,
        componentId: component.id,
        key: checkKey,
        type: "HTTP",
        targetUrl,
        method: pickEnum(HTTP_METHODS, body.method, "GET", "method"),
        expectedStatus: numberInRange(body.expectedStatus, 200, 100, 599, "expectedStatus"),
        timeoutMs: numberInRange(body.timeoutMs, 5000, 1000, 30000, "timeoutMs"),
        intervalSec: numberInRange(body.intervalSec, 60, 60, 86400, "intervalSec"),
        latencyBudgetMs: numberInRange(body.latencyBudgetMs, 800, 1, 600000, "latencyBudgetMs"),
        active: true,
      },
    });
    return { projectId: project.id, targetType: "ProjectCheck", targetId: created.id, check: created };
  }

  if (type === "tenant.upsert") {
    const project = await projectOrThrow(tx, key);
    const externalId = String(body.externalId ?? nanoid(8)).trim();
    const displayName = String(body.displayName ?? "").trim();
    if (!displayName) throw new Error("displayName required");
    const tenant = await tx.tenantRef.upsert({
      where: { projectId_externalId: { projectId: project.id, externalId } },
      create: {
        projectId: project.id,
        externalId,
        displayName,
        status: pickEnum(TENANT_STATUSES, body.status, "ACTIVE", "status"),
        planKey: body.planKey ? String(body.planKey) : null,
        region: body.region ? String(body.region) : "GH",
        piiClass: "NONE",
        sourceUrl: body.sourceUrl ? String(body.sourceUrl) : null,
        cachedSummary: {
          note: "Console-held summary until the product API is connected.",
        },
      },
      update: {
        displayName,
        status: body.status ? pickEnum(TENANT_STATUSES, body.status, "ACTIVE", "status") : undefined,
        planKey: body.planKey !== undefined ? String(body.planKey) : undefined,
        region: body.region ? String(body.region) : undefined,
        sourceUrl: body.sourceUrl !== undefined ? String(body.sourceUrl) : undefined,
      },
    });
    return { projectId: project.id, targetType: "TenantRef", targetId: tenant.id, tenant };
  }

  if (type === "lead.create") {
    const project = await projectOrThrow(tx, key);
    const rawContact = String(body.contact ?? "").trim();
    const contactHash = rawContact
      ? hashToken(rawContact.toLowerCase())
      : String(body.contactHash ?? `hash_${nanoid(8)}`);
    const valueMajor = body.valueMajor == null ? null : Number(body.valueMajor);
    if (valueMajor != null && !Number.isFinite(valueMajor)) throw new Error("valueMajor must be a number");
    const lead = await tx.lead.create({
      data: {
        projectId: project.id,
        source: String(body.source ?? "manual"),
        contactHash,
        contactKind: String(body.contactKind ?? "email"),
        company: body.company ? String(body.company) : null,
        status: pickEnum(LEAD_STATUSES, body.status, "NEW", "status"),
        valueMinor: valueMajor != null ? BigInt(Math.round(valueMajor * 100)) : null,
        ownerOperatorId: operatorId,
      },
    });
    return { projectId: project.id, targetType: "Lead", targetId: lead.id, lead };
  }

  if (type === "lead.move") {
    const lead = await tx.lead.findUnique({ where: { id: String(body.id ?? "") } });
    if (!lead) throw new Error("Lead not found");
    const status = pickEnum(LEAD_STATUSES, body.status, "NEW", "status");
    const next = await tx.lead.update({
      where: { id: lead.id },
      data: { status, lastActivityAt: new Date() },
    });
    return { projectId: lead.projectId, targetType: "Lead", targetId: lead.id, lead: next };
  }

  if (type === "asset.create") {
    const project = await projectOrThrow(tx, key);
    const name = String(body.name ?? "").trim();
    if (!name) throw new Error("name required");
    const asset = await tx.asset.create({
      data: {
        projectId: project.id,
        kind: pickEnum(ASSET_KINDS, body.kind, "DOMAIN", "kind"),
        name,
        identifier: body.identifier ? String(body.identifier) : null,
        expiresAt: body.expiresAt ? parseDate(body.expiresAt, "expiresAt") : null,
        renewalCostMinor: body.renewalCostMinor != null ? BigInt(Number(body.renewalCostMinor)) : null,
        currency: String(body.currency ?? project.currency),
        ownerOperatorId: operatorId,
        notes: body.notes ? String(body.notes) : null,
      },
    });
    if (asset.expiresAt) {
      await upsertExpiryAlert(tx, {
        projectId: project.id,
        assetId: asset.id,
        name: asset.name,
        expiresAt: asset.expiresAt,
      });
    }
    return { projectId: project.id, targetType: "Asset", targetId: asset.id, asset };
  }

  if (type === "asset.renew") {
    const project = await projectOrThrow(tx, key);
    const expiresAt = parseDate(body.expiresAt, "expiresAt");
    const existing = await tx.asset.findFirst({ where: { id: String(body.id ?? ""), projectId: project.id } });
    if (!existing) throw new Error("Asset not found");
    const asset = await tx.asset.update({ where: { id: existing.id }, data: { expiresAt } });
    await upsertExpiryAlert(tx, { projectId: project.id, assetId: asset.id, name: asset.name, expiresAt });
    return { projectId: project.id, targetType: "Asset", targetId: asset.id, asset };
  }

  if (type === "check.toggle") {
    const project = await projectOrThrow(tx, key);
    const check = await tx.projectCheck.findFirst({ where: { id: String(body.checkId ?? ""), projectId: project.id } });
    if (!check) throw new Error("Check not found");
    const next = await tx.projectCheck.update({
      where: { id: check.id },
      data: { active: body.active === false || body.active === "false" ? false : true },
    });
    return { projectId: project.id, targetType: "ProjectCheck", targetId: next.id, check: next };
  }

  if (type === "tenant.archive") {
    const project = await projectOrThrow(tx, key);
    const tenant = await tx.tenantRef.findFirst({ where: { id: String(body.id ?? ""), projectId: project.id } });
    if (!tenant) throw new Error("Tenant not found");
    const next = await tx.tenantRef.update({ where: { id: tenant.id }, data: { status: "ARCHIVED" } });
    return { projectId: project.id, targetType: "TenantRef", targetId: next.id, tenant: next };
  }

  if (type === "revenue.record") {
    const project = await projectOrThrow(tx, key);
    const amountMajor = Number(body.amountMajor ?? NaN);
    if (!Number.isFinite(amountMajor) || amountMajor === 0) throw new Error("amountMajor required");
    const reference = String(body.reference ?? `man_${nanoid(10)}`);
    const event = await tx.revenueEvent.create({
      data: {
        projectId: project.id,
        tenantRef: body.tenantRef ? String(body.tenantRef) : null,
        kind: pickEnum(REVENUE_KINDS, body.kind, "PAYMENT", "kind"),
        amountMinor: BigInt(Math.round(amountMajor * 100)),
        currency: String(body.currency ?? project.currency),
        occurredAt: parseDate(body.occurredAt, "occurredAt", new Date()),
        reference,
        provenance: "MANUAL",
      },
    });
    return { projectId: project.id, targetType: "RevenueEvent", targetId: event.id, event };
  }

  if (type === "subscription.record") {
    const project = await projectOrThrow(tx, key);
    const tenantRef = String(body.tenantRef ?? "").trim();
    if (!tenantRef) throw new Error("tenantRef required");
    const periodStart = parseDate(body.periodStart, "periodStart", new Date());
    const periodEnd = parseDate(
      body.periodEnd,
      "periodEnd",
      new Date(periodStart.getTime() + 30 * 86400000),
    );
    if (periodEnd <= periodStart) throw new Error("periodEnd must be after periodStart");
    const mrrMajor = Number(body.mrrMajor ?? 0);
    if (!Number.isFinite(mrrMajor) || mrrMajor < 0) throw new Error("mrrMajor must be a non-negative number");
    const fact = await tx.subscriptionFact.upsert({
      where: { projectId_tenantRef_periodStart: { projectId: project.id, tenantRef, periodStart } },
      create: {
        projectId: project.id,
        tenantRef,
        planKey: String(body.planKey ?? "standard"),
        status: pickEnum(SUB_STATUSES, body.status, "ACTIVE", "status"),
        mrrMinor: BigInt(Math.round(Number(body.mrrMajor ?? 0) * 100)),
        currency: String(body.currency ?? project.currency),
        periodStart,
        periodEnd,
        provenance: "MANUAL",
        observedAt: new Date(),
      },
      update: {
        status: pickEnum(SUB_STATUSES, body.status, "ACTIVE", "status"),
        mrrMinor: BigInt(Math.round(Number(body.mrrMajor ?? 0) * 100)),
        periodEnd,
        planKey: body.planKey ? String(body.planKey) : undefined,
        observedAt: new Date(),
      },
    });
    return { projectId: project.id, targetType: "SubscriptionFact", targetId: fact.id, fact };
  }

  if (type === "campaign.record") {
    const project = await projectOrThrow(tx, key);
    const campaign = String(body.campaign ?? "").trim();
    if (!campaign) throw new Error("campaign required");
    const amountMajor = Number(body.amountMajor ?? NaN);
    if (!Number.isFinite(amountMajor) || amountMajor < 0) throw new Error("amountMajor required");
    const row = await tx.campaignAttribution.create({
      data: {
        projectId: project.id,
        campaign,
        channel: String(body.channel ?? "other"),
        affiliateCode: body.affiliateCode ? String(body.affiliateCode) : null,
        conversionRef: String(body.conversionRef ?? nanoid(10)),
        amountMinor: BigInt(Math.round(amountMajor * 100)),
        currency: String(body.currency ?? project.currency),
        occurredAt: new Date(),
        provenance: "MANUAL",
      },
    });
    return { projectId: project.id, targetType: "CampaignAttribution", targetId: row.id, row };
  }

  if (type === "spend.record") {
    const project = await projectOrThrow(tx, key);
    const campaign = String(body.campaign ?? "").trim();
    if (!campaign) throw new Error("campaign required");
    const amountMajor = Number(body.amountMajor ?? NaN);
    if (!Number.isFinite(amountMajor) || amountMajor < 0) throw new Error("amountMajor required");
    const channel = String(body.channel ?? "other");
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const dimension = { campaign, channel };
    const dimensionHash = hashToken(JSON.stringify(dimension));
    const snap = await tx.metricSnapshot.upsert({
      where: {
        projectId_metricKey_periodStart_periodEnd_dimensionHash: {
          projectId: project.id,
          metricKey: "campaign.spend",
          periodStart,
          periodEnd,
          dimensionHash,
        },
      },
      create: {
        projectId: project.id,
        metricKey: "campaign.spend",
        value: amountMajor,
        unit: project.currency,
        periodStart,
        periodEnd,
        granularity: "MONTH",
        dimension,
        dimensionHash,
        provenance: "MANUAL",
        observedAt: now,
        quality: "OK",
      },
      update: { value: amountMajor, observedAt: now },
    });
    return { projectId: project.id, targetType: "MetricSnapshot", targetId: snap.id, snap };
  }

  throw new Error(`Unknown command ${type}`);
}

async function runCheckTest(body: Record<string, unknown>, operatorId: string, req: Request) {
  const key = String(body.projectKey ?? "");
  const project = await db.project.findUnique({ where: { key } });
  if (!project) throw new Error("Project not found");
  if (project.status === "ARCHIVED") throw new Error("Project is archived");
  const check = await db.projectCheck.findFirst({
    where: { id: String(body.checkId ?? ""), projectId: project.id },
  });
  if (!check) throw new Error("Check not found");
  if (!check.targetUrl) throw new Error("No target URL");
  assertPublicHttpUrl(check.targetUrl);

  const startedAt = new Date();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), check.timeoutMs ?? 5000);
  let ok = false;
  let statusCode: number | null = null;
  let errorClass: string | null = null;
  try {
    const res = await fetch(check.targetUrl, {
      method: check.method ?? "GET",
      signal: ctrl.signal,
      redirect: "manual",
    });
    statusCode = res.status;
    ok = check.expectedStatus ? res.status === check.expectedStatus : res.status >= 200 && res.status < 400;
    if (!ok) errorClass = "unexpected_status";
  } catch (e) {
    errorClass = e instanceof Error && e.name === "AbortError" ? "timeout" : "network";
  } finally {
    clearTimeout(timer);
  }
  const finishedAt = new Date();
  const consecutiveFailures = ok ? 0 : (check.consecutiveFailures ?? 0) + 1;
  const latencyMs = finishedAt.getTime() - startedAt.getTime();
  const dedupe = `check:${check.id}`;

  await db.$transaction(async (tx) => {
    await tx.probeRun.create({
      data: {
        checkId: check.id,
        projectId: project.id,
        startedAt,
        finishedAt,
        ok,
        statusCode,
        latencyMs,
        errorClass,
        consecutiveFailures,
      },
    });
    await tx.projectCheck.update({
      where: { id: check.id },
      data: { lastRunAt: startedAt, consecutiveFailures },
    });
    if (!ok && consecutiveFailures >= 3) {
      const existing = await tx.alert.findFirst({
        where: { projectId: project.id, openDedupeKey: dedupe },
      });
      if (existing) {
        await tx.alert.update({
          where: { id: existing.id },
          data: { lastSeenAt: finishedAt, detail: errorClass ?? "fail" },
        });
      } else {
        await tx.alert.create({
          data: {
            projectId: project.id,
            checkId: check.id,
            type: "probe.fail",
            severity: consecutiveFailures >= 5 ? "P1" : "P2",
            state: "OPEN",
            dedupeKey: dedupe,
            openDedupeKey: dedupe,
            title: `${check.key} failing`,
            detail: `${errorClass ?? "fail"} · HTTP ${statusCode ?? "n/a"}`,
          },
        });
      }
    } else if (ok) {
      const recent = await tx.probeRun.findMany({
        where: { checkId: check.id },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: { ok: true },
      });
      const threeSuccesses = recent.length === 3 && recent.every((r) => r.ok);
      if (threeSuccesses) {
        await tx.alert.updateMany({
          where: {
            projectId: project.id,
            openDedupeKey: dedupe,
            state: { in: ["OPEN", "ACKED"] },
            firstSeenAt: { lte: new Date(finishedAt.getTime() - 5 * 60 * 1000) },
          },
          data: { state: "RESOLVED", resolvedAt: finishedAt, openDedupeKey: null },
        });
      }
    }
    await writeAudit(tx, {
      actorType: "OPERATOR",
      actorId: operatorId,
      action: "check.test",
      projectId: project.id,
      targetType: "ProbeRun",
      targetId: check.id,
      meta: { ok, statusCode, errorClass },
      req,
    });
  });

  return { projectId: project.id, targetType: "ProbeRun", targetId: check.id, ok, statusCode, latencyMs, errorClass };
}
