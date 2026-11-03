"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { OpsTable } from "@/components/ops/OpsTable";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";

type Row = {
  id: string;
  displayName: string;
  status: string;
  planKey: string | null;
  externalId: string;
  lastSeenAt: string | null;
  projectKey: string;
  projectName: string;
};

type Project = { key: string; name: string };

export default function Page() {
  const q = useQuery({
    queryKey: ["ops-portfolio-surface", "customers"],
    queryFn: async () => {
      const res = await opsFetch<{ rows: Row[] }>("/api/admin/portfolio/surfaces?name=customers");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.rows;
    },
  });
  const projects = useQuery({
    queryKey: ["ops-projects"],
    queryFn: async () => {
      const res = await opsFetch<{ projects: Project[] }>("/api/admin/projects");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.projects;
    },
  });
  const cmd = useOpsCommand([["ops-portfolio-surface", "customers"]]);

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div>
        <h1 className="text-[28px] leading-8 font-medium text-text-primary">Customers</h1>
        <p className="text-sm text-text-tertiary">
          Tenants across the portfolio. No student or parent PII. Empty is No data until a feed or an operator records a tenant.
        </p>
      </div>
      <Panel title="Record a tenant">
        <CommandForm
          pending={cmd.isPending}
          error={cmd.isError ? cmd.error.message : null}
          submitLabel="Save tenant"
          onSubmit={(e) => {
            e.preventDefault();
            const f = formDataOf(e.currentTarget);
            cmd.mutate({
              type: "tenant.upsert",
              projectKey: f.projectKey,
              displayName: f.displayName,
              externalId: f.externalId,
              status: f.status,
              planKey: f.planKey || undefined,
            });
            e.currentTarget.reset();
          }}
        >
          <Field label="Project">
            <select name="projectKey" required className={fieldClass}>
              <option value="">Select…</option>
              {projects.data?.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Display name">
            <input name="displayName" required className={fieldClass} />
          </Field>
          <Field label="External id">
            <input name="externalId" className={fieldClass} />
          </Field>
          <Field label="Plan">
            <input name="planKey" className={fieldClass} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="ACTIVE" className={fieldClass}>
              {["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CHURNED"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </CommandForm>
      </Panel>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && <OpsEmpty title="No tenants" body="Record a tenant above or wait for product ingest." />}
      {q.data && q.data.length > 0 && (
        <OpsTable
          columns={[
            { key: "name", label: "Tenant" },
            { key: "project", label: "Project" },
            { key: "plan", label: "Plan" },
            { key: "status", label: "Status" },
          ]}
          rows={q.data.map((t) => ({
            id: t.id,
            cells: {
              name: (
                <Link href={`/admin/p/${t.projectKey}/customers/${t.id}`} className="hover:underline">
                  {t.displayName}
                </Link>
              ),
              project: t.projectName,
              plan: t.planKey ?? "—",
              status: t.status,
            },
          }))}
        />
      )}
    </div>
  );
}
