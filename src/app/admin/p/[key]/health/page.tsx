"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { MetricCard } from "@/components/ops/MetricCard";
import { TrendChart } from "@/components/ops/TrendChart";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { OpsTable } from "@/components/ops/OpsTable";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { parseRange } from "@/lib/ops/range";
import type { HealthStatus, MetricView } from "@/lib/ops/types";

type Check = {
  id: string;
  key: string;
  type: string;
  targetUrl: string | null;
  method: string | null;
  active: boolean;
  intervalSec: number;
  lastRunAt: string | null;
  consecutiveFailures: number;
  latencyBudgetMs: number | null;
  status: HealthStatus;
};

type Alert = { id: string; title: string; severity: string; state: string; lastSeenAt: string };

type Payload = {
  checks: Check[];
  alerts: Alert[];
  series: { day: string; ok: number; fail: number; samples: number }[];
  metrics: MetricView[];
};

function Inner() {
  const { key } = useParams<{ key: string }>();
  const range = parseRange(useSearchParams().get("range"), "24h");
  const q = useQuery({
    queryKey: ["ops-surface", key, "health", range],
    queryFn: async () => {
      const res = await opsFetch<Payload>(`/api/admin/projects/${key}/surface?name=health&range=${range}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const cmd = useOpsCommand([["ops-surface", key, "health"], ["ops-project", key], ["ops-work"]]);

  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Health and performance"
        subtitle="Probe success is availability. Traffic error rate is shown only when ingested. Disabled checks are Unknown, never Up."
        rangeDefault="24h"
      />
      <div className="grid gap-5 px-2 md:grid-cols-2 lg:px-5">
        {d.metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
      <div className="px-2 lg:px-5">
        <Panel title="Probe success by day">
          <TrendChart
            data={d.series.map((s) => ({ day: s.day, ok: s.ok }))}
            xKey="day"
            yKey="ok"
            unit="runs"
            emptyLabel="No probe runs in this window — availability is No data, not 100%."
          />
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        <Panel title="Register an HTTP check">
          <CommandForm
            pending={cmd.isPending}
            error={cmd.isError ? cmd.error.message : null}
            submitLabel="Add check"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              cmd.mutate({
                type: "check.create",
                projectKey: key,
                key: f.key,
                targetUrl: f.targetUrl,
                method: f.method,
                expectedStatus: Number(f.expectedStatus || 200),
                intervalSec: Number(f.intervalSec || 60),
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Key">
              <input name="key" required placeholder="http-home" className={fieldClass} />
            </Field>
            <Field label="Target URL">
              <input name="targetUrl" required type="url" placeholder="https://example.com/health" className={fieldClass} />
            </Field>
            <Field label="Method">
              <select name="method" defaultValue="GET" className={fieldClass}>
                {["GET", "HEAD"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Expected status">
              <input name="expectedStatus" type="number" defaultValue={200} className={fieldClass} />
            </Field>
            <Field label="Interval (seconds)">
              <input name="intervalSec" type="number" min={60} defaultValue={60} className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {d.checks.length === 0 ? (
          <OpsEmpty
            title="No probes"
            body="Register an HTTP check above. Until a run exists, this project is Unknown — never Up."
          />
        ) : (
          <OpsTable
            columns={[
              { key: "check", label: "Check" },
              { key: "target", label: "Target" },
              { key: "interval", label: "Interval" },
              { key: "last", label: "Last run" },
              { key: "fail", label: "Failures" },
              { key: "run", label: "" },
            ]}
            rows={d.checks.map((c) => ({
              id: c.id,
              cells: {
                check: (
                  <span className="flex items-center gap-2">
                    {c.key} <span className="text-xs text-text-tertiary">{c.type}</span>
                    <StatusBadge status={c.status} />
                  </span>
                ),
                target: <span className="font-mono text-xs">{c.targetUrl ?? "—"}</span>,
                interval: <span className="font-mono">{c.intervalSec}s</span>,
                last: c.lastRunAt ? c.lastRunAt.slice(0, 16).replace("T", " ") : "Never",
                fail: <span className="font-mono">{c.consecutiveFailures}</span>,
                run: (
                  <Button
                    size="xs"
                    appearance="outline"
                    isDisabled={cmd.isPending}
                    onPress={() => cmd.mutate({ type: "check.test", projectKey: key, checkId: c.id })}
                  >
                    Run now
                  </Button>
                ),
              },
            }))}
          />
        )}
      </div>
      {d.alerts.length > 0 && (
        <div className="px-2 lg:px-5">
          <Panel title="Open alerts">
            <ul className="space-y-2">
              {d.alerts.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.severity} · {a.state} · {a.title}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <Inner />
    </Suspense>
  );
}
