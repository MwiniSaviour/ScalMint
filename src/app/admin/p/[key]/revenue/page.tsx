"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { opsFetch } from "@/lib/ops/client-fetch";
import { MetricCard } from "@/components/ops/MetricCard";
import { OpsSkeleton, OpsError } from "@/components/ops/PageStates";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { Uninstrumented } from "@/components/ops/Uninstrumented";
import { parseRange } from "@/lib/ops/range";
import type { MetricView } from "@/lib/ops/types";

function Inner() {
  const { key } = useParams<{ key: string }>();
  const range = parseRange(useSearchParams().get("range"), "mtd");
  const q = useQuery({
    queryKey: ["ops-surface", key, "revenue", range],
    queryFn: async () => {
      const res = await opsFetch<{ metrics: MetricView[]; facts: unknown[]; events: unknown[] }>(
        `/api/admin/projects/${key}/surface?name=revenue&range=${range}`,
      );
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
        title="Revenue and subscriptions"
        subtitle="Contracted MRR and cash collected are shown side by side. School fee invoices never enter ScalMint revenue."
        rangeDefault="mtd"
      />
      <div className="grid gap-5 px-2 md:grid-cols-2 lg:px-5">
        {d.metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
      {d.facts.length === 0 && d.events.length === 0 && (
        <div className="px-2 lg:px-5">
          <Uninstrumented title="Revenue feed" eventName="subscription and revenue ingest events" source="POST /api/ops/ingest/v1/events" />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <Inner />
    </Suspense>
  );
}
