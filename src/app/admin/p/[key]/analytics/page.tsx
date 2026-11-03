"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { MetricCard } from "@/components/ops/MetricCard";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { TrendChart } from "@/components/ops/TrendChart";
import { Panel } from "@/components/ops/forms";
import { parseRange } from "@/lib/ops/range";
import type { MetricView } from "@/lib/ops/types";
import Link from "next/link";

type Payload = {
  series: { day: string; samples: number }[];
  metrics: MetricView[];
  ingest: { id: string; type: string; receivedAt: string }[];
  snapshots: { id: string; metricKey: string; value: string; unit: string; periodStart: string }[];
};

function Inner() {
  const { key } = useParams<{ key: string }>();
  const range = parseRange(useSearchParams().get("range"), "30d");
  const q = useQuery({
    queryKey: ["ops-surface", key, "analytics", range],
    queryFn: async () => {
      const res = await opsFetch<Payload>(`/api/admin/projects/${key}/surface?name=analytics&range=${range}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Analytics"
        subtitle="Activation, tenant growth and ingest. Changing the range recomputes from facts — never client-side averages."
      />
      <div className="grid gap-5 px-2 md:grid-cols-3 lg:px-5">
        {d.metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
      <div className="px-2 lg:px-5">
        <Panel title="Ingested events by day">
          <TrendChart
            data={d.series.map((s) => ({ day: s.day, samples: s.samples }))}
            xKey="day"
            yKey="samples"
            unit="events"
            emptyLabel="Product usage is not connected. Record tenants under Customers, or push ingest events. This is Not connected, not zero users."
          />
        </Panel>
      </div>
      {d.snapshots.length > 0 && (
        <div className="px-2 lg:px-5">
          <Panel title="Product metric snapshots">
            <ul className="space-y-1 text-sm">
              {d.snapshots.slice(0, 20).map((s) => (
                <li key={s.id} className="font-mono text-xs">
                  {s.periodStart.slice(0, 10)} · {s.metricKey} · {s.value} {s.unit}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      <p className="px-2 text-sm text-text-tertiary lg:px-5">
        Tenant directory and first-value events live under{" "}
        <Link href={`/admin/p/${key}/customers`} className="underline">
          Customers
        </Link>
        . Funnel steps appear here only after the product posts metric snapshots.
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <Inner />
    </Suspense>
  );
}
