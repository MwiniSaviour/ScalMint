"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Asset = { id: string; name: string; kind: string; identifier: string | null; expiresAt: string | null };

export default function AssetsPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "assets"],
    queryFn: async () => {
      const res = await opsFetch<{ assets: Asset[] }>(`/api/admin/projects/${key}/surface?name=assets`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.assets;
    },
  });
  return (
    <div className="space-y-5">
      <ProjectHeader title="Assets and renewals" subtitle="Domains, TLS, hosting, licences, API-key metadata. Secrets are never stored or displayed." />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && <OpsEmpty title="No assets" body="Register domains and certificates so 30/14/7/1 day alerts can fire." />}
        {q.data && q.data.length > 0 && (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs">
              <tr>
                {["Name", "Kind", "Identifier", "Expires"].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data.map((a) => (
                <tr key={a.id} className="border-t border-card-border">
                  <td className="px-3 py-3">{a.name}</td>
                  <td className="px-3 py-3">{a.kind}</td>
                  <td className="px-3 py-3 font-mono text-xs">{a.identifier ?? "—"}</td>
                  <td className="px-3 py-3">{a.expiresAt ? a.expiresAt.slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
