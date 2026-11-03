"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { MetricCard } from "@/components/ops/MetricCard";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { TrendChart } from "@/components/ops/TrendChart";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { OpsTable } from "@/components/ops/OpsTable";
import { parseRange } from "@/lib/ops/range";
import type { MetricView } from "@/lib/ops/types";

type Fact = { id: string; tenantRef: string; planKey: string; status: string; mrrMinor: number; periodStart: string };
type Event = { id: string; kind: string; amountMinor: number; occurredAt: string; reference: string; provenance: string };

function Inner() {
  const { key } = useParams<{ key: string }>();
  const range = parseRange(useSearchParams().get("range"), "mtd");
  const q = useQuery({
    queryKey: ["ops-surface", key, "revenue", range],
    queryFn: async () => {
      const res = await opsFetch<{
        metrics: MetricView[];
        facts: Fact[];
        events: Event[];
        series: { day: string; amount: number }[];
        movement?: { neu: number; expansion: number; contraction: number; churn: number; netNew: number };
      }>(`/api/admin/projects/${key}/surface?name=revenue&range=${range}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const cmd = useOpsCommand([["ops-surface", key, "revenue"], ["ops-project", key]]);
  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Revenue and subscriptions"
        subtitle="Contracted MRR and cash collected are shown side by side. School fee invoices never enter ScalMint revenue."
        rangeDefault="mtd"
      />
      <div className="grid gap-5 px-2 md:grid-cols-2 xl:grid-cols-3 lg:px-5">
        {d.metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
      {d.movement && d.facts.length > 0 && (
        <div className="px-2 lg:px-5">
          <Panel title="MRR movement (minor units)">
            <ul className="grid gap-2 text-sm md:grid-cols-5">
              {[
                ["New", d.movement.neu],
                ["Expansion", d.movement.expansion],
                ["Contraction", d.movement.contraction],
                ["Churn", d.movement.churn],
                ["Net new", d.movement.netNew],
              ].map(([label, value]) => (
                <li key={String(label)} className="rounded-lg border border-card-border p-3">
                  <p className="text-xs text-text-tertiary">{label}</p>
                  <p className="font-mono tabular-nums">{value}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      <div className="px-2 lg:px-5">
        <Panel title="Cash collected by day">
          <TrendChart
            data={d.series}
            xKey="day"
            yKey="amount"
            unit="major"
            emptyLabel="No PAYMENT events in this window. Record a collection below or wait for ingest. This is No data, not GH₵ 0.00."
          />
        </Panel>
      </div>
      <div className="grid gap-5 px-2 lg:grid-cols-2 lg:px-5">
        <Panel title="Record cash">
          <CommandForm
            pending={cmd.isPending}
            error={cmd.isError ? cmd.error.message : null}
            submitLabel="Record payment"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              cmd.mutate({
                type: "revenue.record",
                projectKey: key,
                amountMajor: Number(f.amountMajor),
                kind: f.kind,
                tenantRef: f.tenantRef || undefined,
                reference: f.reference || undefined,
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Amount (major units)">
              <input name="amountMajor" type="number" step="0.01" required className={fieldClass} />
            </Field>
            <Field label="Kind">
              <select name="kind" defaultValue="PAYMENT" className={fieldClass}>
                {["PAYMENT", "REFUND", "FEE", "ADJUSTMENT"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Tenant ref (optional)">
              <input name="tenantRef" className={fieldClass} />
            </Field>
            <Field label="Reference (optional)">
              <input name="reference" className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
        <Panel title="Record contracted MRR">
          <CommandForm
            pending={cmd.isPending}
            error={cmd.isError ? cmd.error.message : null}
            submitLabel="Save subscription"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              cmd.mutate({
                type: "subscription.record",
                projectKey: key,
                tenantRef: f.tenantRef,
                planKey: f.planKey,
                mrrMajor: Number(f.mrrMajor),
                status: f.status,
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Tenant ref">
              <input name="tenantRef" required className={fieldClass} />
            </Field>
            <Field label="Plan">
              <input name="planKey" defaultValue="standard" className={fieldClass} />
            </Field>
            <Field label="MRR (major units)">
              <input name="mrrMajor" type="number" step="0.01" required className={fieldClass} />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue="ACTIVE" className={fieldClass}>
                {["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {d.facts.length === 0 && d.events.length === 0 ? (
          <OpsEmpty
            title="No revenue facts"
            body="Record cash or a subscription above, or ingest from the product. Until then MRR is No data — never a fake zero."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <OpsTable
              columns={[
                { key: "tenant", label: "Tenant" },
                { key: "plan", label: "Plan" },
                { key: "status", label: "Status" },
                { key: "mrr", label: "MRR (minor)" },
              ]}
              rows={d.facts.map((f) => ({
                id: f.id,
                cells: {
                  tenant: f.tenantRef,
                  plan: f.planKey,
                  status: f.status,
                  mrr: <span className="font-mono">{f.mrrMinor}</span>,
                },
              }))}
            />
            <OpsTable
              columns={[
                { key: "when", label: "When" },
                { key: "kind", label: "Kind" },
                { key: "amount", label: "Amount (minor)" },
                { key: "ref", label: "Ref" },
              ]}
              rows={d.events.map((e) => ({
                id: e.id,
                cells: {
                  when: e.occurredAt.slice(0, 16).replace("T", " "),
                  kind: `${e.kind} · ${e.provenance}`,
                  amount: <span className="font-mono">{e.amountMinor}</span>,
                  ref: <span className="font-mono text-xs">{e.reference}</span>,
                },
              }))}
            />
          </div>
        )}
      </div>
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
