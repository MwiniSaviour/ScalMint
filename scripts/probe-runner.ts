/**
 * Ops probe runner — VPS worker (pm2), never in the Next.js request path.
 * Tick every 30s; each check runs when now >= lastRun + intervalSec, 10% jitter.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();
const CONCURRENCY = 10;
const TICK_MS = 30_000;

function jitter(intervalSec: number) {
  const delta = intervalSec * 0.1 * (Math.random() * 2 - 1);
  return (intervalSec + delta) * 1000;
}

async function runCheck(check: {
  id: string;
  projectId: string;
  type: string;
  targetUrl: string | null;
  method: string | null;
  expectedStatus: number | null;
  expectedBodyContains: string | null;
  timeoutMs: number;
  consecutiveFailures: number;
}) {
  const startedAt = new Date();
  if (check.type !== "HTTP" || !check.targetUrl) {
    const finishedAt = new Date();
    await persist(check, startedAt, finishedAt, false, null, null, "unsupported_type");
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), check.timeoutMs);
  try {
    const res = await fetch(check.targetUrl, {
      method: check.method ?? "GET",
      signal: ctrl.signal,
      redirect: "manual",
    });
    const body = await res.text().catch(() => "");
    const okStatus = check.expectedStatus ? res.status === check.expectedStatus : res.status >= 200 && res.status < 400;
    const okBody = check.expectedBodyContains ? body.includes(check.expectedBodyContains) : true;
    const ok = okStatus && okBody;
    const finishedAt = new Date();
    await persist(
      check,
      startedAt,
      finishedAt,
      ok,
      res.status,
      finishedAt.getTime() - startedAt.getTime(),
      ok ? null : "unexpected_response",
      crypto.createHash("sha256").update(body.slice(0, 2048)).digest("hex"),
    );
  } catch (err) {
    const finishedAt = new Date();
    const cls = err instanceof Error && err.name === "AbortError" ? "timeout" : "network";
    await persist(check, startedAt, finishedAt, false, null, finishedAt.getTime() - startedAt.getTime(), cls);
  } finally {
    clearTimeout(timer);
  }
}

async function persist(
  check: { id: string; projectId: string; consecutiveFailures: number; key?: string },
  startedAt: Date,
  finishedAt: Date,
  ok: boolean,
  statusCode: number | null,
  latencyMs: number | null,
  errorClass: string | null,
  responseHash?: string,
) {
  const consecutiveFailures = ok ? 0 : check.consecutiveFailures + 1;
  const dedupe = `check:${check.id}`;
  await db.$transaction(async (tx) => {
    await tx.probeRun.create({
      data: {
        checkId: check.id,
        projectId: check.projectId,
        startedAt,
        finishedAt,
        ok,
        statusCode,
        latencyMs,
        errorClass,
        responseHash,
        consecutiveFailures,
      },
    });
    await tx.projectCheck.update({
      where: { id: check.id },
      data: { lastRunAt: startedAt, consecutiveFailures },
    });
    if (!ok && consecutiveFailures >= 3) {
      const existing = await tx.alert.findFirst({ where: { projectId: check.projectId, openDedupeKey: dedupe } });
      if (existing) {
        await tx.alert.update({
          where: { id: existing.id },
          data: { lastSeenAt: finishedAt, detail: errorClass ?? "fail" },
        });
      } else {
        await tx.alert.create({
          data: {
            projectId: check.projectId,
            checkId: check.id,
            type: "probe.fail",
            severity: consecutiveFailures >= 5 ? "P1" : "P2",
            state: "OPEN",
            dedupeKey: dedupe,
            openDedupeKey: dedupe,
            title: `${check.key ?? check.id} failing`,
            detail: `${errorClass ?? "fail"} | HTTP ${statusCode ?? "n/a"}`,
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
            projectId: check.projectId,
            openDedupeKey: dedupe,
            state: { in: ["OPEN", "ACKED"] },
            firstSeenAt: { lte: new Date(finishedAt.getTime() - 5 * 60 * 1000) },
          },
          data: { state: "RESOLVED", resolvedAt: finishedAt, openDedupeKey: null },
        });
      }
    }
  });
}

async function tick() {
  const now = Date.now();
  const checks = await db.projectCheck.findMany({ where: { active: true } });
  const due = checks.filter((c) => {
    if (c.consecutiveFailures >= 10) {
      const runs = Math.floor((now - (c.lastRunAt?.getTime() ?? 0)) / (c.intervalSec * 1000));
      return runs >= 5;
    }
    if (!c.lastRunAt) return true;
    return now >= c.lastRunAt.getTime() + jitter(c.intervalSec);
  });
  const queue = [...due];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      try {
        await runCheck(next);
      } catch (err) {
        console.error("[probe] check failed", next.key, err);
      }
    }
  });
  await Promise.allSettled(workers);
}

async function main() {
  console.log("[probe] runner started");
  const loop = async () => {
    try {
      await tick();
    } catch (err) {
      console.error("[probe] tick failed", err);
    }
  };
  await loop();
  setInterval(loop, TICK_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
