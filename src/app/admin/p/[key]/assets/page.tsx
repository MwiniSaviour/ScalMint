"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { CommandForm, Field, Panel, fieldClass, formDataOf, useOpsCommand } from "@/components/ops/forms";
import { OpsTable } from "@/components/ops/OpsTable";

type Asset = { id: string; name: string; kind: string; identifier: string | null; expiresAt: string | null };

function countdown(iso: string | null) {
  if (!iso) return "—";
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  return `${days}d`;
}

export default function AssetsPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "assets"],
    queryFn: async () => {
      const res = await opsFetch<{ assets: Asset[] }>(`/api/admin/projects/${key}/surface?name=assets`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.assets;
    },
  });
  const cmd = useOpsCommand([["ops-surface", key, "assets"], ["ops-surface", key, "calendar"]]);

  return (
    <div className="space-y-5">
      <ProjectHeader title="Assets and renewals" subtitle="Domains, TLS, hosting, licences, API-key metadata. Secrets are never stored or displayed." />
      <div className="px-2 lg:px-5">
        <Panel title="Register asset">
          <CommandForm
            pending={cmd.isPending}
            error={cmd.isError ? cmd.error.message : null}
            submitLabel="Add asset"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              cmd.mutate({
                type: "asset.create",
                projectKey: key,
                name: f.name,
                kind: f.kind,
                identifier: f.identifier || undefined,
                expiresAt: f.expiresAt || undefined,
              });
              e.currentTarget.reset();
            }}
          >
            <Field label="Name">
              <input name="name" required className={fieldClass} />
            </Field>
            <Field label="Kind">
              <select name="kind" defaultValue="DOMAIN" className={fieldClass}>
                {["DOMAIN", "TLS", "HOSTING", "LICENCE", "API_KEY", "OTHER"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Identifier (hostname, not a secret)">
              <input name="identifier" className={fieldClass} />
            </Field>
            <Field label="Expires">
              <input name="expiresAt" type="date" className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && (
          <OpsEmpty title="No assets" body="Register domains and certificates so 30/14/7/1 day alerts can fire." />
        )}
        {q.data && q.data.length > 0 && (
          <OpsTable
            columns={[
              { key: "name", label: "Name" },
              { key: "kind", label: "Kind" },
              { key: "id", label: "Identifier" },
              { key: "exp", label: "Expires" },
              { key: "days", label: "Countdown" },
              { key: "act", label: "" },
            ]}
            rows={q.data.map((a) => ({
              id: a.id,
              cells: {
                name: a.name,
                kind: a.kind,
                id: <span className="font-mono text-xs">{a.identifier ?? "—"}</span>,
                exp: a.expiresAt ? a.expiresAt.slice(0, 10) : "—",
                days: countdown(a.expiresAt),
                act: (
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => {
                      const next = window.prompt("New expiry (YYYY-MM-DD)");
                      if (next) cmd.mutate({ type: "asset.renew", projectKey: key, id: a.id, expiresAt: next });
                    }}
                  >
                    Renew
                  </button>
                ),
              },
            }))}
          />
        )}
      </div>
    </div>
  );
}
