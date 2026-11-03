"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { OpsTable } from "@/components/ops/OpsTable";

type Tenant = {
  id: string;
  externalId: string;
  displayName: string;
  status: string;
  planKey: string | null;
  lastSeenAt: string | null;
  region: string | null;
};

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
  const cmd = useOpsCommand([["ops-surface", key, "customers"], ["ops-surface", key, "analytics"]]);

  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Customers"
        subtitle="Tenant directory. No student, parent, or staff PII is stored here. Detail uses the product API when connected."
      />
      <div className="px-2 lg:px-5">
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
                projectKey: key,
                displayName: f.displayName,
                externalId: f.externalId,
                status: f.status,
                planKey: f.planKey || undefined,
                region: f.region || undefined,
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Display name">
              <input name="displayName" required className={fieldClass} />
            </Field>
            <Field label="External id">
              <input name="externalId" placeholder="school-or-merchant-id" className={fieldClass} />
            </Field>
            <Field label="Plan">
              <input name="planKey" className={fieldClass} />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue="ACTIVE" className={fieldClass}>
                {["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CHURNED", "ARCHIVED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Region">
              <input name="region" defaultValue="GH" className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && (
          <OpsEmpty
            title="No tenants"
            body="Ingest tenant facts, connect the product read API, or record a tenant above. An empty directory is not zero customers if the feed is missing — this is No data."
          />
        )}
        {q.data && q.data.length > 0 && (
          <OpsTable
            columns={[
              { key: "name", label: "Tenant" },
              { key: "plan", label: "Plan" },
              { key: "status", label: "Status" },
              { key: "seen", label: "Last seen" },
            ]}
            rows={q.data.map((t) => ({
              id: t.id,
              cells: {
                name: (
                  <Link href={`/admin/p/${key}/customers/${t.id}`} className="hover:underline">
                    {t.displayName}
                    <span className="ml-2 font-mono text-xs text-text-tertiary">{t.externalId}</span>
                  </Link>
                ),
                plan: t.planKey ?? "—",
                status: t.status,
                seen: t.lastSeenAt ? t.lastSeenAt.slice(0, 10) : "—",
              },
            }))}
          />
        )}
      </div>
    </div>
  );
}
