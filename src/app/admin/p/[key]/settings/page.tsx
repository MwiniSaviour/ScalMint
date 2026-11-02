"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

type Project = { key: string; name: string; status: string; lastIngestAt: string | null };

export default function ProjectSettingsPage() {
  const { key } = useParams<{ key: string }>();
  const qc = useQueryClient();
  const [secret, setSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const q = useQuery({
    queryKey: ["ops-project", key],
    queryFn: async () => {
      const res = await opsFetch<{ project: Project }>(`/api/admin/projects/${key}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.project;
    },
  });
  const token = useMutation({
    mutationFn: async () => {
      const res = await opsFetch<{ token: { secret: string; prefix: string }; warning: string }>(
        `/api/admin/projects/${key}/tokens`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ingest" }) },
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
    onSuccess: (d) => setSecret(d.token.secret),
  });
  const archive = useMutation({
    mutationFn: async (restore: boolean) => {
      const res = await opsFetch(`/api/admin/projects/${key}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restore ? { restore: true } : { confirm }),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-project", key] }),
  });
  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const p = q.data!;
  return (
    <div className="space-y-5">
      <ProjectHeader title="Project settings" subtitle="Identity, ingest tokens, archive. There is no hard-delete." />
      <div className="space-y-5 px-2 lg:px-5">
        <section className="rounded-xl border border-card-border p-5">
          <h2 className="text-sm font-medium">Ingest</h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Last accepted event: {p.lastIngestAt ?? "never"}. Tokens are hashed; the secret is shown once.
          </p>
          <Button className="mt-3" size="sm" onPress={() => token.mutate()}>
            Create ingest token
          </Button>
          {secret && (
            <p className="mt-3 break-all font-mono text-xs">
              {secret}
              <span className="mt-1 block text-text-tertiary">Copy now. The console will not show this again.</span>
            </p>
          )}
        </section>
        <section className="rounded-xl border border-card-border p-5">
          <h2 className="text-sm font-medium">Danger zone</h2>
          {p.status === "ARCHIVED" ? (
            <Button className="mt-3" size="sm" onPress={() => archive.mutate(true)}>
              Restore project
            </Button>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-sm">
                Type {p.key} to archive
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 block rounded-lg border border-card-border px-3 py-2" />
              </label>
              <Button size="sm" appearance="outline" onPress={() => archive.mutate(false)}>
                Archive
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
