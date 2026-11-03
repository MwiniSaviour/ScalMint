"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { fieldClass } from "@/components/ops/forms";

type Row = {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  projectId: string | null;
  meta?: unknown;
};

export default function AuditPage() {
  const [project, setProject] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const q = useQuery({
    queryKey: ["ops-audit", project, action, actor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (project) params.set("project", project);
      if (action) params.set("action", action);
      if (actor) params.set("actor", actor);
      const res = await opsFetch<{ activities: Row[]; nextCursor: string | null }>(`/api/admin/audit?${params}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-medium">Audit log</h1>
          <p className="text-sm text-text-tertiary">Append-only. There is no update or delete endpoint. Export is a snapshot, not a live stream.</p>
        </div>
        <Button
          size="sm"
          appearance="outline"
          onPress={() => {
            const params = new URLSearchParams({ format: "csv" });
            if (project) params.set("project", project);
            if (action) params.set("action", action);
            if (actor) params.set("actor", actor);
            window.location.assign(`/api/admin/audit?${params}`);
          }}
        >
          Export CSV
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input
          placeholder="Project key"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className={fieldClass}
        />
        <input placeholder="Action contains" value={action} onChange={(e) => setAction(e.target.value)} className={fieldClass} />
        <select value={actor} onChange={(e) => setActor(e.target.value)} className={fieldClass}>
          <option value="">Any actor</option>
          <option value="OPERATOR">OPERATOR</option>
          <option value="SYSTEM">SYSTEM</option>
          <option value="PRODUCT">PRODUCT</option>
        </select>
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.activities.length === 0 && <OpsEmpty title="No activity yet" body="Writes from operators, ingest, and the probe runner appear here." />}
      {q.data && q.data.activities.length > 0 && (
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              {["When", "Actor", "Action", "Target"].map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.data.activities.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-card-border" onClick={() => setOpen(r)}>
                <td className="px-3 py-3 font-mono text-xs">{r.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td className="px-3 py-3">
                  {r.actorType}
                  <span className="ml-1 font-mono text-[11px] text-text-tertiary">{r.actorId.slice(0, 8)}</span>
                </td>
                <td className="px-3 py-3">{r.action}</td>
                <td className="px-3 py-3">
                  {r.targetType}
                  <span className="ml-1 font-mono text-[11px] text-text-tertiary">{r.targetId.slice(0, 8)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <div className="rounded-xl border border-card-border p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {open.action} · {open.targetType}
            </h2>
            <button type="button" className="text-xs underline" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
          <pre className="overflow-auto text-xs">{JSON.stringify(open.meta ?? {}, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
