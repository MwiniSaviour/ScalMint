"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { CommandForm, Field, Panel, fieldClass, formDataOf } from "@/components/ops/forms";

type Project = {
  key: string;
  name: string;
  status: string;
  lastIngestAt: string | null;
  description: string | null;
  homepageUrl: string | null;
  firstValueEvent: string | null;
  timezone: string;
  currency: string;
  lifecycleStage: string;
};

export default function ProjectSettingsPage() {
  const { key } = useParams<{ key: string }>();
  const qc = useQueryClient();
  const [secret, setSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const tokens = useQuery({
    queryKey: ["ops-tokens", key],
    queryFn: async () => {
      const res = await opsFetch<{ tokens: { id: string; name: string; tokenPrefix: string; scopes: string[]; lastUsedAt: string | null; revokedAt: string | null }[] }>(
        `/api/admin/projects/${key}/tokens`,
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.tokens;
    },
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const res = await opsFetch(`/api/admin/projects/${key}/tokens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-tokens", key] }),
  });
  const q = useQuery({
    queryKey: ["ops-project", key],
    queryFn: async () => {
      const res = await opsFetch<{ project: Project }>(`/api/admin/projects/${key}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.project;
    },
  });
  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await opsFetch(`/api/admin/projects/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-project", key] }),
  });
  const token = useMutation({
    mutationFn: async () => {
      const res = await opsFetch<{ token: { secret: string; prefix: string }; warning: string }>(
        `/api/admin/projects/${key}/tokens`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ingest" }) },
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
    onSuccess: (d) => {
      setSecret(d.token.secret);
      void qc.invalidateQueries({ queryKey: ["ops-tokens", key] });
    },
  });
  const archive = useMutation({
    mutationFn: async (restore: boolean) => {
      const res = await opsFetch(`/api/admin/projects/${key}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restore ? { restore: true } : { confirm }),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-project", key] }),
  });
  if (q.isLoading) return <OpsSkeleton />;
  if (q.isError) return <OpsError message={q.error.message} onRetry={() => q.refetch()} />;
  const p = q.data!;
  return (
    <div className="space-y-5">
      <ProjectHeader title="Project settings" subtitle="Identity, ingest tokens, archive. There is no hard-delete. Key is immutable." />
      <div className="space-y-5 px-2 lg:px-5">
        <Panel title="Identity">
          <CommandForm
            pending={save.isPending}
            error={save.isError ? save.error.message : null}
            submitLabel="Save"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(formDataOf(e.currentTarget));
            }}
          >
            <Field label="Name">
              <input name="name" defaultValue={p.name} required className={fieldClass} />
            </Field>
            <Field label="Lifecycle">
              <select name="lifecycleStage" defaultValue={p.lifecycleStage} className={fieldClass}>
                {["IDEA", "BUILD", "LAUNCH", "GROW", "MAINTAIN", "SUNSET"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <input name="currency" defaultValue={p.currency} className={fieldClass} />
            </Field>
            <Field label="Timezone">
              <input name="timezone" defaultValue={p.timezone} className={fieldClass} />
            </Field>
            <Field label="Homepage">
              <input name="homepageUrl" defaultValue={p.homepageUrl ?? ""} className={fieldClass} />
            </Field>
            <Field label="First-value event">
              <input name="firstValueEvent" defaultValue={p.firstValueEvent ?? ""} className={fieldClass} />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <input name="description" defaultValue={p.description ?? ""} className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
        <section className="rounded-xl border border-card-border p-5">
          <h2 className="text-sm font-medium">Ingest</h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Last accepted event: {p.lastIngestAt ?? "never"}. Tokens are hashed; the secret is shown once.
          </p>
          <Button className="mt-3" size="sm" onPress={() => token.mutate()}>
            Create ingest token
          </Button>
          {secret && (
            <p className="mt-3 break-all font-mono text-xs">
              {secret}
              <span className="mt-1 block text-text-tertiary">Copy now. The console will not show this again.</span>
            </p>
          )}
          {tokens.data && tokens.data.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {tokens.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span>
                    {t.name} <span className="font-mono text-xs">{t.tokenPrefix}…</span>{" "}
                    {t.revokedAt ? <span className="text-text-tertiary">revoked</span> : t.scopes.join(", ")}
                  </span>
                  {!t.revokedAt && (
                    <Button size="xs" appearance="outline" onPress={() => revoke.mutate(t.id)}>
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-card-border p-5">
          <h2 className="text-sm font-medium">Danger zone</h2>
          {p.status === "ARCHIVED" ? (
            <Button className="mt-3" size="sm" onPress={() => archive.mutate(true)}>
              Restore project
            </Button>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-sm">
                Type {p.key} to archive
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 block rounded-lg border border-card-border px-3 py-2" />
              </label>
              <Button size="sm" appearance="outline" onPress={() => archive.mutate(false)}>
                Archive
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
