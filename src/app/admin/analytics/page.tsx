"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { RangeControl } from "@/components/ops/RangeControl";
import { OpsTable } from "@/components/ops/OpsTable";
import { parseRange } from "@/lib/ops/range";

type Row = {
  key: string;
  name: string;
  kind: string;
  tenants: number;
  newTenants: number;
  ingestEvents: number;
  instrumented: boolean;
};

function Inner() {
  const range = parseRange(useSearchParams().get("range"), "30d");
  const q = useQuery({
    queryKey: ["ops-portfolio-surface", "analytics", range],
    queryFn: async () => {
      const res = await opsFetch<{ rows: Row[]; window: string; projectCount: number; asOf: string }>(
        `/api/admin/portfolio/surfaces?name=analytics&range=${range}`,
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-8 font-medium text-text-primary">Multi-project performance</h1>
          <p className="text-sm text-text-tertiary">
            Tenant growth and ingest across {q.data?.projectCount ?? "—"} projects. Uninstrumented products show Not connected, not zero.
          </p>
        </div>
        <RangeControl fallback="30d" />
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.rows.length === 0 && <OpsEmpty title="No projects" body="Create a project to compare performance." />}
      {q.data && q.data.rows.length > 0 && (
        <OpsTable
          columns={[
            { key: "name", label: "Project" },
            { key: "kind", label: "Kind" },
            { key: "tenants", label: "Tenants" },
            { key: "new", label: "New in window" },
            { key: "ingest", label: "Ingest events" },
          ]}
          rows={q.data.rows.map((r) => ({
            id: r.key,
            cells: {
              name: (
                <Link href={`/admin/p/${r.key}/analytics`} className="hover:underline">
                  {r.name}
                </Link>
              ),
              kind: r.kind,
              tenants: r.tenants > 0 ? r.tenants : "No data",
              new: r.tenants > 0 ? r.newTenants : "—",
              ingest: r.ingestEvents === 0 ? "Not connected" : r.ingestEvents,
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
