"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { Kanban } from "@/components/ops/Kanban";

type Lead = {
  id: string;
  company: string | null;
  status: string;
  source: string;
  lastActivityAt: string;
  valueMinor: number | null;
  contactKind: string;
};

const STAGES = [
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "QUALIFIED", label: "Qualified" },
  { id: "PROPOSAL", label: "Proposal" },
  { id: "WON", label: "Won" },
  { id: "LOST", label: "Lost" },
];

export default function PipelinePage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "pipeline"],
    queryFn: async () => {
      const res = await opsFetch<{ leads: Lead[] }>(`/api/admin/projects/${key}/surface?name=pipeline`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.leads;
    },
  });
  const cmd = useOpsCommand([["ops-surface", key, "pipeline"]]);
  const [staleOnly, setStaleOnly] = useState(false);
  const leads = (q.data ?? []).filter((l) => (staleOnly ? stale(l.lastActivityAt) : true));

  return (
    <div className="space-y-5">
      <ProjectHeader title="Pipeline" subtitle="Leads by stage. Stale means no activity for 14 days. Contacts are stored as hashes. Nothing is auto-deleted." />
      <div className="px-2 lg:px-5">
        <Panel title="Add lead">
          <CommandForm
            pending={cmd.isPending}
            error={cmd.isError ? cmd.error.message : null}
            submitLabel="Add lead"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              cmd.mutate({
                type: "lead.create",
                projectKey: key,
                company: f.company,
                source: f.source,
                contact: f.contact,
                contactKind: f.contactKind,
                valueMajor: f.valueMajor ? Number(f.valueMajor) : undefined,
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Company">
              <input name="company" required className={fieldClass} />
            </Field>
            <Field label="Source">
              <input name="source" defaultValue="manual" className={fieldClass} />
            </Field>
            <Field label="Contact (hashed, never stored raw)">
              <input name="contact" type="email" required className={fieldClass} />
            </Field>
            <Field label="Contact kind">
              <select name="contactKind" defaultValue="email" className={fieldClass}>
                <option value="email">email</option>
                <option value="phone">phone</option>
              </select>
            </Field>
            <Field label="Value (major, optional)">
              <input name="valueMajor" type="number" step="0.01" className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
          Stale only (no activity for 14 days)
        </label>
        {q.data?.length === 0 && <OpsEmpty title="No leads" body="Create leads from marketing or add them above." />}
        {leads.length > 0 && (
          <Kanban
            columns={STAGES}
            items={leads}
            statusOf={(l) => l.status}
            movingId={cmd.isPending ? "pending" : null}
            onMove={(lead, status) => cmd.mutate({ type: "lead.move", id: lead.id, status })}
            renderCard={(l) => (
              <div>
                <p className="font-medium">{l.company ?? l.source}</p>
                <p className="text-xs text-text-tertiary">
                  {l.source} · {l.lastActivityAt.slice(0, 10)}
                  {stale(l.lastActivityAt) ? " · stale" : ""}
                </p>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

function stale(iso: string) {
  return Date.now() - new Date(iso).getTime() > 14 * 86400000;
}
