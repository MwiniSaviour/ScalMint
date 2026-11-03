"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { RangeControl } from "@/components/ops/RangeControl";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { OpsTable } from "@/components/ops/OpsTable";
import { parseRange } from "@/lib/ops/range";
import type { HealthStatus } from "@/lib/ops/types";

type Row = {
  key: string;
  name: string;
  kind: string;
  stage: string;
  status: HealthStatus;
  checks: number;
  openAlerts: number;
  availability: number | null;
};

function Inner() {
  const range = parseRange(useSearchParams().get("range"), "30d");
  const q = useQuery({
    queryKey: ["ops-portfolio-surface", "health", range],
    queryFn: async () => {
      const res = await opsFetch<{ rows: Row[]; window: string; projectCount: number; asOf: string }>(
        `/api/admin/portfolio/surfaces?name=health&range=${range}`,
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-8 font-medium text-text-primary">Portfolio health</h1>
          <p className="text-sm text-text-tertiary">
            Worst status across {q.data?.projectCount ?? "—"} projects. Availability is probe success, never assumed 100%.
            {q.data?.asOf && <span className="ml-2">As of {q.data.asOf.replace("T", " ").slice(0, 16)} UTC</span>}
          </p>
        </div>
        <RangeControl fallback="30d" />
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.rows.length === 0 && <OpsEmpty title="No projects" body="Create a project to start probing." />}
      {q.data && q.data.rows.length > 0 && (
        <OpsTable
          columns={[
            { key: "name", label: "Project" },
            { key: "status", label: "Health" },
            { key: "checks", label: "Checks" },
            { key: "avail", label: "Availability" },
            { key: "alerts", label: "Open alerts" },
          ]}
          rows={q.data.rows.map((r) => ({
            id: r.key,
            cells: {
              name: (
                <Link href={`/admin/p/${r.key}/health`} className="hover:underline">
                  {r.name}
                  <span className="ml-2 font-mono text-xs text-text-tertiary">{r.key}</span>
                </Link>
              ),
              status: <StatusBadge status={r.status} />,
              checks: r.checks === 0 ? "None — Unknown" : r.checks,
              avail: r.availability == null ? "No data" : `${(r.availability * 100).toFixed(2)}%`,
              alerts: r.openAlerts,
            },
          }))}
        />
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
