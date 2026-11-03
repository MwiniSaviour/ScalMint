"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { OpsTable } from "@/components/ops/OpsTable";
import { parseRange } from "@/lib/ops/range";

type Row = {
  id: string;
  campaign: string;
  channel: string;
  affiliateCode: string | null;
  amountMinor: number;
  occurredAt: string;
  provenance: string;
};

function Inner() {
  const { key } = useParams<{ key: string }>();
  const range = parseRange(useSearchParams().get("range"), "30d");
  const q = useQuery({
    queryKey: ["ops-surface", key, "marketing", range],
    queryFn: async () => {
      const res = await opsFetch<{ attributions: Row[]; window: string }>(
        `/api/admin/projects/${key}/surface?name=marketing&range=${range}`,
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const cmd = useOpsCommand([["ops-surface", key, "marketing"]]);

  return (
    <div className="space-y-5">
      <ProjectHeader title="Marketing" subtitle="Last-touch or self-reported source only — labelled, never multi-touch. Affiliate rows stay in the programme." />
      <div className="px-2 lg:px-5">
        <Panel title="Record attribution">
          <CommandForm
            pending={cmd.isPending}
            error={cmd.isError ? cmd.error.message : null}
            submitLabel="Record"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              cmd.mutate({
                type: "campaign.record",
                projectKey: key,
                campaign: f.campaign,
                channel: f.channel,
                amountMajor: Number(f.amountMajor || 0),
                affiliateCode: f.affiliateCode || undefined,
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Campaign">
              <input name="campaign" required className={fieldClass} />
            </Field>
            <Field label="Channel">
              <input name="channel" defaultValue="direct" className={fieldClass} />
            </Field>
            <Field label="Amount (major)">
              <input name="amountMajor" type="number" step="0.01" className={fieldClass} />
            </Field>
            <Field label="Affiliate code (optional)">
              <input name="affiliateCode" className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.attributions.length === 0 && (
          <OpsEmpty
            title="No attribution in this window"
            body="Record last-touch conversions above. This is No data, not a zero CAC chart."
          />
        )}
        {q.data && q.data.attributions.length > 0 && (
          <OpsTable
            columns={[
              { key: "when", label: "When" },
              { key: "campaign", label: "Campaign" },
              { key: "channel", label: "Channel" },
              { key: "amount", label: "Amount (minor)" },
            ]}
            rows={q.data.attributions.map((r) => ({
              id: r.id,
              cells: {
                when: r.occurredAt.slice(0, 16).replace("T", " "),
                campaign: `${r.campaign} · ${r.provenance}`,
                channel: r.affiliateCode ? `${r.channel} · ${r.affiliateCode}` : r.channel,
                amount: <span className="font-mono">{r.amountMinor}</span>,
              },
            }))}
          />
        )}
        <p className="mt-4 text-sm">
          Affiliate performance for this product lives in the{" "}
          <Link className="underline" href="/admin/programme">
            programme
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<OpsSkeleton />}>
      <Inner />
    </Suspense>
  );
}
