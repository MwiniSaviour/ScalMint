"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { CommandForm, Field, Panel, fieldClass, formDataOf } from "@/components/ops/forms";
import { OpsTable } from "@/components/ops/OpsTable";

type Channel = { id: string; kind: string; severities: string[]; active: boolean; targetHint: string };

export default function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ops-channels"],
    queryFn: async () => {
      const res = await opsFetch<{ channels: Channel[] }>("/api/admin/channels");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.channels;
    },
  });
  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await opsFetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-channels"] }),
  });

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div>
        <h1 className="text-[28px] font-medium">Settings</h1>
        <p className="text-sm text-text-tertiary">
          Portfolio integrations, alert channels, and retention. Targets are encrypted at rest; only a hint is shown.
        </p>
      </div>
      <Panel title="Alert channels (P1 by default)">
        <CommandForm
          pending={create.isPending}
          error={create.isError ? create.error.message : null}
          submitLabel="Add channel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = formDataOf(e.currentTarget);
            create.mutate({ kind: f.kind, target: f.target, severities: f.severities.split(",") });
            e.currentTarget.reset();
          }}
        >
          <Field label="Kind">
            <select name="kind" defaultValue="EMAIL" className={fieldClass}>
              <option>EMAIL</option>
              <option>WEBHOOK</option>
            </select>
          </Field>
          <Field label="Target (email or https webhook)">
            <input name="target" required className={fieldClass} />
          </Field>
          <Field label="Severities">
            <input name="severities" defaultValue="P1" className={fieldClass} />
          </Field>
        </CommandForm>
        {q.isLoading && <OpsSkeleton rows={2} />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && <OpsEmpty title="No channels" body="P1 alerts stay in the work queue until a channel exists." />}
        {q.data && q.data.length > 0 && (
          <div className="mt-4">
            <OpsTable
              columns={[
                { key: "kind", label: "Kind" },
                { key: "sev", label: "Severities" },
                { key: "hint", label: "Target hint" },
                { key: "active", label: "Active" },
              ]}
              rows={q.data.map((c) => ({
                id: c.id,
                cells: {
                  kind: c.kind,
                  sev: c.severities.join(", "),
                  hint: <span className="font-mono text-xs">…{c.targetHint}</span>,
                  active: c.active ? "yes" : "no",
                },
              }))}
            />
          </div>
        )}
      </Panel>
      <section className="rounded-xl border border-card-border p-5 text-sm">
        <h2 className="font-medium">Retention</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
          <li>Raw probe runs: 90 days</li>
          <li>Hourly/daily rollups: 25 months</li>
          <li>Audit: 7 years</li>
        </ul>
      </section>
      <section className="rounded-xl border border-card-border p-5 text-sm">
        <h2 className="font-medium">Probe runner</h2>
        <p className="mt-2 text-text-secondary">
          Runs on the VPS via <code className="font-mono">npm run ops:probe</code> (pm2), not inside the Next.js request path.
          Console self-health is the <span className="font-mono">scalmint-ops</span> project.
        </p>
      </section>
    </div>
  );
}
