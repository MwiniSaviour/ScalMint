"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Task = { id: string; title: string; status: string; priority: string; dueAt: string | null };

export default function TasksPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "tasks"],
    queryFn: async () => {
      const res = await opsFetch<{ tasks: Task[] }>(`/api/admin/projects/${key}/surface?name=tasks`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.tasks;
    },
  });
  return (
    <div className="space-y-5">
      <ProjectHeader title="Tasks" subtitle="Project work queue. Keyboard move: complete or cancel with a reason. Nothing is hard-deleted." />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data?.length === 0 && <OpsEmpty title="No tasks" body="Create work from alerts or the portfolio queue." />}
        {q.data && q.data.length > 0 && (
          <ul className="space-y-2">
            {q.data.map((t) => (
              <li key={t.id} className="rounded-lg border border-card-border px-4 py-3 text-sm">
                {t.priority} · {t.status} · {t.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
