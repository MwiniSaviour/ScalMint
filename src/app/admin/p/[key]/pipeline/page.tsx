"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Lead = { id: string; company: string | null; status: string; source: string; lastActivityAt: string; valueMinor: string | number | null };

export default function PipelinePage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "pipeline"],
    queryFn: async () => {
      const res = await opsFetch<{ leads: Lead[] }>(`/api/admin/projects/${key}/surface?name=pipeline`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.leads;
    },
  });
  const stages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
  return (
    <div className="space-y-5">
      <ProjectHeader title="Pipeline" subtitle="Leads by stage. Stale means no activity for 14 days. Nothing is auto-deleted." />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && <OpsEmpty title="No leads" body="Create leads from marketing or add them here. Contacts are stored as hashes." />}
        {q.data && q.data.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {stages.map((s) => (
              <div key={s} className="rounded-xl border border-card-border p-3">
                <p className="text-xs font-medium uppercase text-text-tertiary">{s}</p>
                <ul className="mt-2 space-y-2">
                  {q.data.filter((l) => l.status === s).map((l) => (
                    <li key={l.id} className="rounded-lg bg-background-gray-primary p-2 text-sm">
                      {l.company ?? l.source}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
