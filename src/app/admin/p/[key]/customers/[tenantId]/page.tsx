"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Tenant = { id: string; displayName: string; status: string; planKey: string | null; cachedSummary: unknown; externalId: string };

export default function TenantDetailPage() {
  const { key, tenantId } = useParams<{ key: string; tenantId: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "customers"],
    queryFn: async () => {
      const res = await opsFetch<{ tenants: Tenant[] }>(`/api/admin/projects/${key}/surface?name=customers`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.tenants.find((t) => t.id === tenantId) ?? null;
    },
  });
  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  if (!q.data) return <OpsError message="Tenant not in the console cache." />;
  return (
    <div className="space-y-5 px-2 lg:px-6">
      <p className="text-sm">
        <Link href={`/admin/p/${key}/customers`} className="underline">
          Customers
        </Link>
      </p>
      <h1 className="text-[28px] font-medium">{q.data.displayName}</h1>
      <p className="text-sm text-text-tertiary">
        Status {q.data.status} · plan {q.data.planKey ?? "—"} · external {q.data.externalId}
      </p>
      <div className="rounded-xl border border-card-border p-5 text-sm text-text-secondary">
        Product API detail is on-demand with a 5s timeout. This project is not connected, so you are seeing the cached
        summary only — labelled cached, never an empty page pretending to be live.
        <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(q.data.cachedSummary ?? { note: "No cached summary" }, null, 2)}</pre>
      </div>
    </div>
  );
}
