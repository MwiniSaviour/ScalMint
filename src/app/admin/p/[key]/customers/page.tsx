"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { ProjectHeader } from "@/components/ops/ProjectHeader";

type Tenant = { id: string; externalId: string; displayName: string; status: string; planKey: string | null; lastSeenAt: string | null };

export default function CustomersPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "customers"],
    queryFn: async () => {
      const res = await opsFetch<{ tenants: Tenant[] }>(`/api/admin/projects/${key}/surface?name=customers`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.tenants;
    },
  });
  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Customers"
        subtitle="Tenant directory. No student, parent, or staff PII is stored here. Detail uses the product API when connected."
      />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && (
          <OpsEmpty title="No tenants" body="Ingest tenant facts or connect the product read API. An empty directory is not zero customers if the feed is missing — this is No data." />
        )}
        {q.data && q.data.length > 0 && (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-text-secondary">
              <tr>
                {["Tenant", "Plan", "Status", "Last seen"].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data.map((t) => (
                <tr key={t.id} className="border-t border-card-border">
                  <td className="px-3 py-3">
                    <Link href={`/admin/p/${key}/customers/${t.id}`} className="hover:underline">
                      {t.displayName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{t.planKey ?? "—"}</td>
                  <td className="px-3 py-3">{t.status}</td>
                  <td className="px-3 py-3 text-xs">{t.lastSeenAt ? t.lastSeenAt.slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
