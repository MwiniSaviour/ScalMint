"use client";

import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Row = { id: string; actorType: string; actorId: string; action: string; targetType: string; createdAt: string; projectId: string | null };

export default function AuditPage() {
  const q = useQuery({
    queryKey: ["ops-audit"],
    queryFn: async () => {
      const res = await opsFetch<{ activities: Row[]; nextCursor: string | null }>("/api/admin/audit");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div>
        <h1 className="text-[28px] font-medium">Audit log</h1>
        <p className="text-sm text-text-tertiary">Append-only. There is no update or delete endpoint.</p>
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.activities.length === 0 && <OpsEmpty title="No activity yet" body="Writes from operators, ingest, and the probe runner appear here." />}
      {q.data && q.data.activities.length > 0 && (
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              {["When", "Actor", "Action", "Target"].map((h) => (
                <th key={h} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.data.activities.map((r) => (
              <tr key={r.id} className="border-t border-card-border">
                <td className="px-3 py-3 font-mono text-xs">{r.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td className="px-3 py-3">{r.actorType}</td>
                <td className="px-3 py-3">{r.action}</td>
                <td className="px-3 py-3">{r.targetType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
