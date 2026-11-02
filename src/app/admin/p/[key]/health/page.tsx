"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { Uninstrumented } from "@/components/ops/Uninstrumented";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { StatusBadge } from "@/components/ops/StatusBadge";
import type { HealthStatus } from "@/lib/ops/types";

type Payload = {
  project: { name: string; statusHealth: HealthStatus; lifecycleStage: string };
  checks: {
    id: string;
    key: string;
    type: string;
    active: boolean;
    intervalSec: number;
    lastRunAt: string | null;
    consecutiveFailures: number;
    latencyBudgetMs: number | null;
  }[];
};

export default function HealthPage() {
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
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Health and performance"
        subtitle="Probe success is availability. Traffic error rate is shown only when ingested. Disabled checks are Unknown, never Up."
        status={d.project.statusHealth}
        stage={d.project.lifecycleStage}
        rangeDefault="24h"
      />
      <div className="px-2 lg:px-5">
        {d.checks.length === 0 ? (
          <Uninstrumented title="No probes" eventName="ProjectCheck HTTP/heartbeat" source="console check runner" />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-text-secondary">
              <tr>
                {["Check", "Interval", "Last run", "Failures", "Budget"].map((h) => (
                  <th key={h} className="px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.checks.map((c) => (
                <tr key={c.id} className="border-t border-card-border">
                  <td className="px-3 py-3">
                    {c.key} <span className="text-xs text-text-tertiary">{c.type}</span>
                    {!c.active && <StatusBadge status="UNKNOWN" />}
                  </td>
                  <td className="px-3 py-3 font-mono">{c.intervalSec}s</td>
                  <td className="px-3 py-3 text-xs">{c.lastRunAt ? c.lastRunAt.slice(0, 16).replace("T", " ") : "Never"}</td>
                  <td className="px-3 py-3 font-mono">{c.consecutiveFailures}</td>
                  <td className="px-3 py-3 font-mono">{c.latencyBudgetMs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
