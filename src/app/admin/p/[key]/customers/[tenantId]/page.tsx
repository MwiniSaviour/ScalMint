"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { Panel } from "@/components/ops/forms";

type Tenant = {
  id: string;
  displayName: string;
  status: string;
  planKey: string | null;
  cachedSummary: unknown;
  externalId: string;
  sourceUrl: string | null;
  region: string | null;
};

export default function TenantDetailPage() {
  const { key, tenantId } = useParams<{ key: string; tenantId: string }>();
  const q = useQuery({
    queryKey: ["ops-tenant", key, tenantId],
    queryFn: async () => {
      const res = await opsFetch<{ tenant: Tenant; live: unknown; liveError: string | null; source: string }>(
        `/api/admin/projects/${key}/tenants/${tenantId}`,
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data!;
  return (
    <div className="space-y-5 px-2 lg:px-6">
      <p className="text-sm">
        <Link href={`/admin/p/${key}/customers`} className="underline">
          Customers
        </Link>
      </p>
      <h1 className="text-[28px] font-medium">{d.tenant.displayName}</h1>
      <p className="text-sm text-text-tertiary">
        Status {d.tenant.status} · plan {d.tenant.planKey ?? "—"} · external {d.tenant.externalId}
        {d.tenant.region ? ` · ${d.tenant.region}` : ""}
      </p>
      {d.liveError && (
        <div className="rounded-lg border border-badge-warning-background px-4 py-3 text-sm" role="status">
          Product API did not respond ({d.liveError}). Showing the cached summary — labelled cached, never an empty live page.
        </div>
      )}
      {!d.tenant.sourceUrl && (
        <p className="text-sm text-text-tertiary">
          No product source URL is set. This directory row is console-held until the product read API is connected.
        </p>
      )}
      {d.live != null && (
        <Panel title="Live product (5s timeout)">
          <pre className="overflow-auto text-xs">{JSON.stringify(d.live, null, 2)}</pre>
        </Panel>
      )}
      <Panel title={`Cached summary · source ${d.source}`}>
        <pre className="overflow-auto text-xs">
          {JSON.stringify(d.tenant.cachedSummary ?? { note: "No cached summary" }, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
