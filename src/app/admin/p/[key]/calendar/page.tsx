"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";

type Asset = { id: string; name: string; kind: string; expiresAt: string | null };
type Task = { id: string; title: string; dueAt: string | null; priority: string; status: string };

export default function CalendarPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "calendar"],
    queryFn: async () => {
      const res = await opsFetch<{ assets: Asset[]; tasks: Task[] }>(`/api/admin/projects/${key}/surface?name=calendar`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const items = [
    ...(q.data?.assets
      .filter((a) => a.expiresAt)
      .map((a) => ({ id: a.id, date: a.expiresAt!.slice(0, 10), label: `${a.kind} · ${a.name}`, kind: "renewal" })) ?? []),
    ...(q.data?.tasks
      .filter((t) => t.dueAt)
      .map((t) => ({
        id: t.id,
        date: t.dueAt!.slice(0, 10),
        label: `${t.priority} · ${t.title}`,
        kind: "task",
      })) ?? []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-5">
      <ProjectHeader title="Calendar" subtitle="Renewals, launches, maintenance, term dates. Every asset expiry and task due date appears here." rangeDefault="90d" />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data && items.length === 0 && (
          <OpsEmpty title="No upcoming dates" body="Add domains, TLS and licences under Assets, or due dates on tasks. Term dates appear when the product ingests them." />
        )}
        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={`${i.kind}-${i.id}`} className="rounded-lg border border-card-border px-4 py-3 text-sm">
                <span className="font-mono">{i.date}</span>
                <span className="ml-2 text-xs uppercase text-text-tertiary">{i.kind}</span>
                <span className="ml-2">{i.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
