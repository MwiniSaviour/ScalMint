"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { CommandForm, Field, Panel, fieldClass, formDataOf } from "@/components/ops/forms";
import { Kanban } from "@/components/ops/Kanban";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

type Task = { id: string; title: string; status: string; priority: string; dueAt: string | null };

const COLUMNS = [
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "DONE", label: "Done" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default function TasksPage() {
  const { key } = useParams<{ key: string }>();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ops-surface", key, "tasks"],
    queryFn: async () => {
      const res = await opsFetch<{ tasks: Task[] }>(`/api/admin/projects/${key}/surface?name=tasks`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.tasks;
    },
  });
  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await opsFetch("/api/admin/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error ?? "Create failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-surface", key, "tasks"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-surface", key, "tasks"] }),
  });

  return (
    <div className="space-y-5">
      <ProjectHeader title="Tasks" subtitle="Project work queue. Complete or cancel with a reason. Nothing is hard-deleted." />
      <div className="px-2 lg:px-5">
        <Panel title="Create task">
          <CommandForm
            pending={create.isPending}
            error={create.isError ? create.error.message : null}
            submitLabel="Add task"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formDataOf(e.currentTarget);
              create.mutate({ projectKey: key, title: f.title, priority: f.priority, dueAt: f.dueAt || undefined });
              e.currentTarget.reset();
            }}
          >
            <Field label="Title" className="md:col-span-2">
              <input name="title" required className={fieldClass} />
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue="P2" className={fieldClass}>
                {["P1", "P2", "P3"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Due">
              <input name="dueAt" type="date" className={fieldClass} />
            </Field>
          </CommandForm>
        </Panel>
      </div>
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && <OpsEmpty title="No tasks" body="Create work from alerts or the form above." />}
        {q.data && q.data.length > 0 && (
          <Kanban
            columns={COLUMNS}
            items={q.data}
            statusOf={(t) => t.status}
            onMove={(task, status) => {
              if (status === "CANCELLED") {
                const reason = window.prompt("Cancellation reason");
                if (!reason) return;
                move.mutate({ id: task.id, status, cancelReason: reason });
                return;
              }
              move.mutate({ id: task.id, status });
            }}
            renderCard={(t) => (
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-text-tertiary">
                  {t.priority}
                  {t.dueAt ? ` · due ${t.dueAt.slice(0, 10)}` : ""}
                </p>
                {t.status !== "DONE" && t.status !== "CANCELLED" && (
                  <Button className="mt-2" size="xs" onPress={() => move.mutate({ id: t.id, status: "DONE" })}>
                    Complete
                  </Button>
                )}
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
