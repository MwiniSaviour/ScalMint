"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { opsFetch } from "@/lib/ops/client-fetch";
import { MetricCard } from "@/components/ops/MetricCard";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { RangeControl } from "@/components/ops/RangeControl";
import { StatusBadge } from "@/components/ops/StatusBadge";
import type { HealthStatus, MetricView } from "@/lib/ops/types";
import { parseRange } from "@/lib/ops/range";

type Portfolio = {
  asOf: string;
  window: string;
  projectCount: number;
  attention: { key: string; label: string; count: number; href: string }[];
  metrics: MetricView[];
  projects: {
    key: string;
    name: string;
    kind: string;
    stage: string;
    status: HealthStatus;
    mrrMinor: number | null;
    mrrQuality: string;
    availability: number | null;
    openP1: number;
    lastIngestAt: string | null;
  }[];
  activity?: { id: string; action: string; actorType: string; targetType: string; createdAt: string }[];
};

export default function PortfolioHomePage() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <PortfolioHome />
    </Suspense>
  );
}

function PortfolioHome() {
  const params = useSearchParams();
  const range = parseRange(params.get("range"), "30d");
  const q = useQuery({
    queryKey: ["ops-portfolio", range],
    queryFn: async () => {
      const res = await opsFetch<Portfolio>(`/api/admin/portfolio?range=${range}`);
      if (res.unauthorized) throw new Error("Unauthorized");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });

  const data = q.data;
  const needs = data?.attention.filter((a) => a.count > 0) ?? [];

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 lg:px-6">
        <div>
          <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Portfolio</h1>
          <p className="text-sm leading-5 text-text-tertiary">
            What is broken, unpaid, or expiring today. Across {data?.projectCount ?? "—"} projects.
            {data?.asOf && <span className="ml-2">As of {data.asOf.replace("T", " ").slice(0, 16)} UTC</span>}
          </p>
        </div>
        <RangeControl fallback="30d" />
      </div>

      {q.isLoading && <OpsSkeleton />}
      {q.isError && <div className="px-2 lg:px-5"><OpsError message={q.error.message} onRetry={() => q.refetch()} /></div>}

      {data && (
        <div className="space-y-5 px-2 lg:px-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {needs.length === 0 ? (
              <div className="rounded-xl border border-card-border bg-card-background p-5 md:col-span-2">
                <p className="text-sm font-medium text-text-primary">Nothing needs attention</p>
                <p className="mt-1 text-xs text-text-tertiary">As of {data.asOf.replace("T", " ").slice(0, 16)} UTC</p>
              </div>
            ) : (
              needs.map((item) => (
                <Link key={item.key} href={item.href} className="rounded-xl border border-card-border bg-card-background p-5 hover:bg-background-gray-primary">
                  <p className="text-xs text-text-tertiary">{item.label}</p>
                  <p className="mt-1 font-mono text-2xl tabular-nums text-text-primary">{item.count}</p>
                </Link>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
            {data.metrics.map((m) => (
              <MetricCard key={m.key} metric={m} />
            ))}
          </div>

          {data.projects.length === 0 ? (
            <OpsEmpty
              title="Create your first project"
              body="The console is a read model. Register OPERASCH, Nova POS, sites and apps here, then attach checks and ingest tokens."
              action={
                <Link href="/admin/projects?new=1" className="text-sm font-medium text-text-primary underline">
                  Open project registry
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-card-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-background-gray-secondary_alt text-xs text-text-secondary">
                  <tr>
                    {["Project", "Stage", "Status", "MRR", "Availability", "P1", "Last ingest"].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr key={p.key} className="border-t border-card-border">
                      <td className="px-4 py-3">
                        <Link href={`/admin/p/${p.key}`} className="font-medium text-text-primary hover:underline">
                          {p.name}
                        </Link>
                        <span className="ml-2 text-xs text-text-tertiary">{p.kind}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{p.stage}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {p.mrrQuality === "MISSING" || p.mrrMinor == null ? "No data" : `GHS ${(p.mrrMinor / 100).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {p.availability == null ? "No data" : `${(p.availability * 100).toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{p.openP1}</td>
                      <td className="px-4 py-3 text-xs text-text-tertiary">{p.lastIngestAt ? p.lastIngestAt.slice(0, 16).replace("T", " ") : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.activity && data.activity.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium">Last 24 hours</h2>
              <ul className="space-y-1 text-sm">
                {data.activity.map((a) => (
                  <li key={a.id} className="text-text-secondary">
                    <span className="font-mono text-xs">{a.createdAt.slice(0, 16).replace("T", " ")}</span>
                    <span className="ml-2">{a.actorType}</span>
                    <span className="ml-2">{a.action}</span>
                    <span className="ml-2 text-text-tertiary">{a.targetType}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
