import type { Prisma } from "@prisma/client";
import { opsDb as db } from "@/lib/db";
import { verifyHubSignature } from "@/lib/hub/signature";
import { writeAudit } from "@/lib/ops/audit";
import { hashToken } from "@/lib/ops/crypto";

const MAX_EVENTS = 500;
const MAX_BYTES = 256 * 1024;
const TYPES = new Set(["metric", "health", "subscription", "revenue", "tenant", "ai"]);

export type IngestResult =
  | { status: 202; accepted: number; duplicates: number }
  | { status: 400 | 401 | 413; error: string };

type EventIn = {
  id?: string;
  type?: string;
  observedAt?: string;
  payload?: Record<string, unknown>;
};

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return req.headers.get("x-ops-token");
}

export async function ingestBatch(req: Request, raw: string): Promise<IngestResult> {
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) return { status: 413, error: "Payload too large" };

  const projectKey = req.headers.get("x-project-key")?.trim();
  const signature = req.headers.get("x-signature");
  const timestamp = req.headers.get("x-timestamp");
  const rawToken = bearer(req);
  if (!projectKey || !signature || !rawToken) return { status: 401, error: "Missing project key, token, or signature" };

  const header = signature.includes("t=") ? signature : `t=${timestamp ?? ""},v1=${signature}`;
  if (!verifyHubSignature(rawToken, raw, header)) return { status: 401, error: "Bad signature" };

  const project = await db.project.findUnique({ where: { key: projectKey } });
  if (!project || project.status === "ARCHIVED") return { status: 401, error: "Unknown project" };

  const token = await db.projectServiceToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || token.revokedAt || token.projectId !== project.id) {
    return { status: 401, error: "Unknown or revoked token" };
  }
  if (!token.scopes.includes("INGEST_WRITE")) return { status: 401, error: "Token missing INGEST_WRITE" };

  let body: { schemaVersion?: string; events?: EventIn[] };
  try {
    body = JSON.parse(raw) as { schemaVersion?: string; events?: EventIn[] };
  } catch {
    return { status: 400, error: "Invalid JSON" };
  }
  if (body.schemaVersion !== "1" || !Array.isArray(body.events)) {
    return { status: 400, error: "schemaVersion 1 and events[] required" };
  }
  if (body.events.length === 0 || body.events.length > MAX_EVENTS) {
    return { status: 400, error: `events must be 1–${MAX_EVENTS}` };
  }
  for (const event of body.events) {
    if (!event?.id || !event.type || !event.observedAt || typeof event.payload !== "object") {
      return { status: 400, error: "Each event needs id, type, observedAt, payload" };
    }
    if (!TYPES.has(event.type)) return { status: 400, error: `Unknown type ${event.type}` };
    if (Number.isNaN(Date.parse(event.observedAt))) return { status: 400, error: "Invalid observedAt" };
  }

  let accepted = 0;
  let duplicates = 0;
  await db.$transaction(async (tx) => {
    for (const event of body.events!) {
      try {
        await tx.ingestEvent.create({
          data: {
            projectId: project.id,
            sourceEventId: event.id!,
            type: event.type!,
            payload: event as Prisma.InputJsonValue,
            status: "ACCEPTED",
          },
        });
        accepted += 1;
      } catch (err) {
        if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2002") {
          duplicates += 1;
          continue;
        }
        throw err;
      }
    }
    await tx.projectServiceToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });
    await writeAudit(tx, {
      actorType: "PRODUCT",
      actorId: project.key,
      action: "ingest.accepted",
      projectId: project.id,
      targetType: "IngestEvent",
      targetId: project.id,
      meta: { accepted, duplicates },
      req,
    });
  });

  void processAccepted(project.id).catch((err) => console.error("[ingest] process", err));
  return { status: 202, accepted, duplicates };
}

export async function processAccepted(projectId: string) {
  const pending = await db.ingestEvent.findMany({
    where: { projectId, processedAt: null, status: "ACCEPTED" },
    take: 200,
    orderBy: { receivedAt: "asc" },
  });
  for (const row of pending) {
    try {
      const envelope = row.payload as { type?: string; observedAt?: string; payload?: Record<string, unknown> };
      const observedAt = envelope.observedAt ? new Date(envelope.observedAt) : row.receivedAt;
      const body = envelope.payload ?? {};
      if (row.type === "subscription") {
        const tenantRef = String(body.tenantRef ?? "").trim();
        if (!tenantRef) throw new Error("subscription event is missing tenantRef");
        const periodStart = parseDate(body.periodStart ?? observedAt, "periodStart");
        const periodEnd = parseDate(
          body.periodEnd ?? new Date(periodStart.getTime() + 86400000 * 30),
          "periodEnd",
        );
        if (periodEnd <= periodStart) throw new Error("periodEnd must be after periodStart");
        const mrrMinor = parseMinor(body.mrrMinor, "mrrMinor");
        const planKey = String(body.planKey ?? "unknown");
        const currency = String(body.currency ?? "GHS");
        const units = body.units == null ? null : Number(body.units);
        if (units != null && !Number.isFinite(units)) throw new Error("units must be a number");
        const status = asSubStatus(body.status);
        await db.subscriptionFact.upsert({
          where: { projectId_tenantRef_periodStart: { projectId, tenantRef, periodStart } },
          create: {
            projectId,
            tenantRef,
            planKey,
            status,
            mrrMinor,
            currency,
            periodStart,
            periodEnd,
            units,
            provenance: "PUSH",
            sourceEventId: row.sourceEventId,
            observedAt,
          },
          update: {
            planKey,
            status,
            mrrMinor,
            currency,
            periodEnd,
            units,
            observedAt,
          },
        });
      } else if (row.type === "revenue") {
        const reference = String(body.reference ?? row.sourceEventId);
        if (!reference) throw new Error("revenue event is missing reference");
        const amountMinor = parseMinor(body.amountMinor, "amountMinor");
        const kind = asRevKind(body.kind);
        const currency = String(body.currency ?? "GHS");
        const occurredAt = parseDate(body.occurredAt ?? observedAt, "occurredAt");
        await db.revenueEvent.upsert({
          where: { projectId_reference: { projectId, reference } },
          create: {
            projectId,
            tenantRef: body.tenantRef ? String(body.tenantRef) : null,
            kind,
            amountMinor,
            currency,
            occurredAt,
            reference,
            provenance: "PUSH",
            sourceEventId: row.sourceEventId,
          },
          update: {
            kind,
            amountMinor,
            currency,
            occurredAt,
          },
        });
      } else if (row.type === "tenant") {
        const externalId = String(body.externalId ?? body.id ?? "").trim();
        if (!externalId) throw new Error("tenant event is missing externalId");
        const displayName = String(body.displayName ?? externalId);
        const status = asTenantStatus(body.status);
        const planKey = body.planKey ? String(body.planKey) : undefined;
        const region = body.region ? String(body.region) : undefined;
        await db.tenantRef.upsert({
          where: { projectId_externalId: { projectId, externalId } },
          create: {
            projectId,
            externalId,
            displayName,
            status,
            planKey: planKey ?? null,
            region: region ?? null,
            piiClass: "NONE",
            lastSeenAt: observedAt,
          },
          update: {
            displayName,
            status,
            planKey,
            region,
            lastSeenAt: observedAt,
          },
        });
      } else if (row.type === "metric" || row.type === "health" || row.type === "ai") {
        const metricKey = String(body.metricKey ?? row.type);
        const periodStart = parseDate(body.periodStart ?? observedAt, "periodStart");
        const periodEnd = parseDate(body.periodEnd ?? observedAt, "periodEnd");
        if (periodEnd < periodStart) throw new Error("periodEnd must not be before periodStart");
        const value = Number(body.value ?? 0);
        if (!Number.isFinite(value)) throw new Error("value must be a number");
        const dimensionHash = String(body.dimensionHash ?? "");
        const unit = String(body.unit ?? "count");
        await db.metricSnapshot.upsert({
          where: {
            projectId_metricKey_periodStart_periodEnd_dimensionHash: {
              projectId,
              metricKey,
              periodStart,
              periodEnd,
              dimensionHash,
            },
          },
          create: {
            projectId,
            metricKey,
            value,
            unit,
            periodStart,
            periodEnd,
            granularity: "DAY",
            dimensionHash,
            provenance: "PUSH",
            sourceRef: row.sourceEventId,
            observedAt,
            quality: "OK",
          },
          update: { value, unit, observedAt, quality: "OK" },
        });
      }
      await db.ingestEvent.update({
        where: { id: row.id },
        data: { processedAt: new Date(), status: "PROCESSED" },
      });
    } catch (err) {
      await db.ingestEvent.update({
        where: { id: row.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : "process failed" },
      });
    }
  }
}

function parseDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`${field} is not a valid date`);
  return date;
}

function parseMinor(value: unknown, field: string): bigint {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
  return BigInt(Math.round(n));
}

const SUB_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"] as const;
const REV_KINDS = ["PAYMENT", "REFUND", "FEE", "ADJUSTMENT"] as const;
const TENANT_STATUSES = ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CHURNED", "ARCHIVED"] as const;

function asSubStatus(v: unknown): (typeof SUB_STATUSES)[number] {
  const s = String(v ?? "ACTIVE");
  if (!(SUB_STATUSES as readonly string[]).includes(s)) throw new Error(`Unknown subscription status ${s}`);
  return s as (typeof SUB_STATUSES)[number];
}

function asRevKind(v: unknown): (typeof REV_KINDS)[number] {
  const s = String(v ?? "PAYMENT");
  if (!(REV_KINDS as readonly string[]).includes(s)) throw new Error(`Unknown revenue kind ${s}`);
  return s as (typeof REV_KINDS)[number];
}

function asTenantStatus(v: unknown): (typeof TENANT_STATUSES)[number] {
  const s = String(v ?? "ACTIVE");
  if (!(TENANT_STATUSES as readonly string[]).includes(s)) throw new Error(`Unknown tenant status ${s}`);
  return s as (typeof TENANT_STATUSES)[number];
}
