"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { opsFetch } from "@/lib/ops/client-fetch";
import { MetricCard } from "@/components/ops/MetricCard";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { StatusBadge } from "@/components/ops/StatusBadge";
import type { HealthStatus, MetricView } from "@/lib/ops/types";

type Payload = {
  project: {
    name: string;
    key: string;
    kind: string;
    lifecycleStage: string;
    statusHealth: HealthStatus;
    lastIngestAt: string | null;
    firstValueEvent: string | null;
    currency: string;
  };
  components: { id: string; name: string; type: string; status: HealthStatus }[];
  openAlerts: number;
  metrics: MetricView[];
};

export default function ProjectOverviewPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-project", key],
    queryFn: async () => {
      const res = await opsFetch<Payload>(`/api/admin/projects/${key}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });

  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <div className="px-6"><OpsError message={q.error.message} onRetry={() => q.refetch()} /></div>;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <ProjectHeader
        title={d.project.name}
        subtitle={`${d.project.kind} · ingest ${d.project.lastIngestAt ? d.project.lastIngestAt.slice(0, 16).replace("T", " ") : "never"} · ${d.openAlerts} open alerts`}
        status={d.project.statusHealth}
        stage={d.project.lifecycleStage}
      />
      <div className="grid grid-cols-1 gap-5 px-2 md:grid-cols-2 lg:px-5">
        {d.metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
      <div className="px-2 lg:px-5">
        <h2 className="mb-3 text-sm font-medium">Components</h2>
        {d.components.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No checks registered. This project is Unknown, never Up. Add components and HTTP checks in Settings.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {d.components.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-card-border p-4">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-text-tertiary">{c.type}</p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
