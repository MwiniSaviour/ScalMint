"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Asset = { id: string; name: string; kind: string; expiresAt: string | null };

export default function CalendarPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "assets"],
    queryFn: async () => {
      const res = await opsFetch<{ assets: Asset[] }>(`/api/admin/projects/${key}/surface?name=assets`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.assets.filter((a) => a.expiresAt);
    },
  });
  return (
    <div className="space-y-5">
      <ProjectHeader title="Calendar" subtitle="Renewals, launches, maintenance, term dates. Every asset expiry appears here." rangeDefault="90d" />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && <OpsEmpty title="No upcoming expiries" body="Add domains, TLS and licences under Assets. Term dates appear when the product ingests them." />}
        {q.data && q.data.length > 0 && (
          <ul className="space-y-2">
            {q.data.map((a) => (
              <li key={a.id} className="rounded-lg border border-card-border px-4 py-3 text-sm">
                {a.expiresAt?.slice(0, 10)} · {a.kind} · {a.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
