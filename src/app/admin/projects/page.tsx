"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import type { HealthStatus } from "@/lib/ops/types";

type Project = {
  id: string;
  key: string;
  name: string;
  kind: string;
  lifecycleStage: string;
  status: string;
  statusHealth: HealthStatus;
  currency: string;
  timezone: string;
  archivedAt: string | null;
};

function ProjectsInner() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [form, setForm] = useState({ key: "", name: "", kind: "SAAS", currency: "GHS", timezone: "Africa/Accra" });
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState("");
  const [qtext, setQtext] = useState("");

  const q = useQuery({
    queryKey: ["ops-projects"],
    queryFn: async () => {
      const res = await opsFetch<{ projects: Project[] }>("/api/admin/projects");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.projects;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await opsFetch<{ project: Project }>("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error ?? "Create failed");
      return res.data;
    },
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["ops-projects"] });
    },
    onError: (e) => setMsg(e.message),
  });

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-8 font-medium text-text-primary">Projects</h1>
          <p className="text-sm text-text-tertiary">Registry and lifecycle. Keys are immutable. Archive never deletes facts.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Create project
        </Button>
      </div>

      {open && (
        <form
          className="grid gap-3 rounded-xl border border-card-border bg-card-background p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg("");
            create.mutate();
          }}
        >
          {(["key", "name", "currency", "timezone"] as const).map((field) => (
            <label key={field} className="text-sm">
              {field}
              <input
                required
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
              />
            </label>
          ))}
          <label className="text-sm">
            kind
            <select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
            >
              {["SAAS", "POS", "WEBSITE", "WEBAPP", "INTERNAL", "SERVICE"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" isDisabled={create.isPending}>
              Save
            </Button>
            <Button type="button" size="sm" appearance="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {msg && <p className="text-sm text-error-500 md:col-span-2">{msg}</p>}
        </form>
      )}

      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && (
        <OpsEmpty title="No projects" body="Create OPERASCH, Nova POS, or a client site to start monitoring." />
      )}
      {q.data && q.data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <input
            value={qtext}
            onChange={(e) => setQtext(e.target.value)}
            placeholder="Search name or key"
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-card-border px-3 py-2 text-sm">
            <option value="">All kinds</option>
            {["SAAS", "POS", "WEBSITE", "WEBAPP", "INTERNAL", "SERVICE"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
      )}
      {q.data && q.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-background-gray-secondary_alt text-xs">
              <tr>
                {["Name", "Kind", "Stage", "Health", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data
                .filter((p) => (!kind || p.kind === kind) && (!qtext || `${p.name} ${p.key}`.toLowerCase().includes(qtext.toLowerCase())))
                .map((p) => (
                <tr key={p.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <Link href={`/admin/p/${p.key}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-text-tertiary">{p.key}</span>
                  </td>
                  <td className="px-4 py-3">{p.kind}</td>
                  <td className="px-4 py-3">{p.lifecycleStage}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.statusHealth} />
                  </td>
                  <td className="px-4 py-3">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <ProjectsInner />
    </Suspense>
  );
}
