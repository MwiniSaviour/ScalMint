"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  projectId: string | null;
  cancelReason: string | null;
};

type Alert = { id: string; title: string; severity: string; state: string; projectId: string; project?: { key: string; name: string } };

export default function WorkPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ops-work"],
    queryFn: async () => {
      const res = await opsFetch<{ tasks: Task[]; alerts: Alert[] }>("/api/admin/work");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const move = useMutation({
    mutationFn: async (body: { id: string; status: string; cancelReason?: string }) => {
      const res = await opsFetch(`/api/admin/work/${body.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error ?? "Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-work"] }),
  });
  const ack = useMutation({
    mutationFn: async (id: string) => {
      const res = await opsFetch(`/api/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "ACKED" }),
      });
      if (!res.ok) throw new Error(res.error ?? "Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-work"] }),
  });
  const taskFromAlert = useMutation({
    mutationFn: async (a: Alert) => {
      const res = await opsFetch("/api/admin/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          projectKey: a.project?.key,
          alertId: a.id,
          priority: a.severity === "P1" ? "P1" : "P2",
        }),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-work"] }),
  });

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div>
        <h1 className="text-[28px] leading-8 font-medium text-text-primary">Work queue</h1>
        <p className="text-sm text-text-tertiary">Tasks and open alerts across the portfolio. Tasks are cancelled with a reason, never deleted.</p>
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && q.data.tasks.length === 0 && q.data.alerts.length === 0 && (
        <OpsEmpty title="Queue is clear" body="P1 alerts can create a linked task in one action from a project health page." />
      )}
      {q.data && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-medium">Alerts</h2>
            <ul className="space-y-2">
              {q.data.alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-card-border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-text-tertiary">
                      {a.severity} · {a.state}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {a.state === "OPEN" && (
                      <Button size="sm" appearance="outline" onPress={() => ack.mutate(a.id)}>
                        Acknowledge
                      </Button>
                    )}
                    <Button size="sm" onPress={() => taskFromAlert.mutate(a)}>
                      Create task
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-medium">Tasks</h2>
            <ul className="space-y-2">
              {q.data.tasks.map((t) => (
                <li key={t.id} className="rounded-lg border border-card-border p-3">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {t.priority} · {t.status}
                    {t.dueAt ? ` · due ${t.dueAt.slice(0, 10)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {t.status !== "DONE" && (
                      <Button size="xs" onPress={() => move.mutate({ id: t.id, status: "DONE" })}>
                        Complete
                      </Button>
                    )}
                    {t.status !== "CANCELLED" && (
                      <Button
                        size="xs"
                        appearance="outline"
                        onPress={() => {
                          const reason = window.prompt("Cancellation reason");
                          if (reason) move.mutate({ id: t.id, status: "CANCELLED", cancelReason: reason });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
