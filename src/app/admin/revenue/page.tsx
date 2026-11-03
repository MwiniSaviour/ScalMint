"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { RangeControl } from "@/components/ops/RangeControl";
import { MetricCard } from "@/components/ops/MetricCard";
import { OpsTable } from "@/components/ops/OpsTable";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { parseRange } from "@/lib/ops/range";
import type { MetricView } from "@/lib/ops/types";

type Row = {
  key: string;
  name: string;
  kind: string;
  currency: string;
  mrr: number | null;
  mrrQuality: string;
  cash: number | null;
  cashQuality: string;
};

function Inner() {
  const range = parseRange(useSearchParams().get("range"), "mtd");
  const [projectKey, setProjectKey] = useState("");
  const q = useQuery({
    queryKey: ["ops-portfolio-surface", "revenue", range],
    queryFn: async () => {
      const res = await opsFetch<{ rows: Row[]; metrics: MetricView[]; projectCount: number; asOf: string }>(
        `/api/admin/portfolio/surfaces?name=revenue&range=${range}`,
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const cmd = useOpsCommand([["ops-portfolio-surface", "revenue"]]);

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-8 font-medium text-text-primary">Portfolio revenue</h1>
          <p className="text-sm text-text-tertiary">
            Contracted MRR and cash collected, never blended. Across {q.data?.projectCount ?? "—"} projects.
          </p>
        </div>
        <RangeControl fallback="mtd" />
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && (
        <div className="grid gap-5 md:grid-cols-2">
          {q.data.metrics.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>
      )}
      <Panel title="Record cash against a project">
        <CommandForm
          pending={cmd.isPending}
          error={cmd.isError ? cmd.error.message : null}
          submitLabel="Record payment"
          onSubmit={(e) => {
            e.preventDefault();
            const f = formDataOf(e.currentTarget);
            cmd.mutate({
              type: "revenue.record",
              projectKey: f.projectKey,
              amountMajor: Number(f.amountMajor),
              kind: "PAYMENT",
              tenantRef: f.tenantRef || undefined,
            });
            e.currentTarget.reset();
          }}
        >
          <Field label="Project">
            <select
              name="projectKey"
              required
              className={fieldClass}
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
            >
              <option value="">Select…</option>
              {q.data?.rows.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (major)">
            <input name="amountMajor" type="number" step="0.01" required className={fieldClass} />
          </Field>
          <Field label="Tenant ref (optional)">
            <input name="tenantRef" className={fieldClass} />
          </Field>
        </CommandForm>
      </Panel>
      {q.data?.rows.length === 0 && <OpsEmpty title="No projects" body="Create a project before recording revenue." />}
      {q.data && q.data.rows.length > 0 && (
        <OpsTable
          columns={[
            { key: "name", label: "Project" },
            { key: "mrr", label: "MRR" },
            { key: "cash", label: "Cash in window" },
          ]}
          rows={q.data.rows.map((r) => ({
            id: r.key,
            cells: {
              name: (
                <Link href={`/admin/p/${r.key}/revenue`} className="hover:underline">
                  {r.name}
                </Link>
              ),
              mrr: r.mrrQuality === "MISSING" ? "No data" : `${r.mrr?.toFixed(2)} ${r.currency}`,
              cash: r.cashQuality === "MISSING" ? "No data" : `${r.cash?.toFixed(2)} ${r.currency}`,
            },
          }))}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <Inner />
    </Suspense>
  );
}
