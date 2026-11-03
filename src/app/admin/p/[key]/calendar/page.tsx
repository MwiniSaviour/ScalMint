"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { MonthCalendar, type CalEvent } from "@/components/ops/MonthCalendar";
import { Panel } from "@/components/ops/forms";

type Asset = { id: string; name: string; kind: string; expiresAt: string | null };
type Task = { id: string; title: string; dueAt: string | null; priority: string; status: string };

export default function CalendarPage() {
  const { key } = useParams<{ key: string }>();
  const now = useMemo(() => new Date(), []);
  const q = useQuery({
    queryKey: ["ops-surface", key, "calendar"],
    queryFn: async () => {
      const res = await opsFetch<{ assets: Asset[]; tasks: Task[] }>(`/api/admin/projects/${key}/surface?name=calendar`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const events: CalEvent[] = [
    ...(q.data?.assets
      .filter((a) => a.expiresAt)
      .map((a) => ({ id: `a-${a.id}`, date: a.expiresAt!.slice(0, 10), label: a.name, kind: a.kind })) ?? []),
    ...(q.data?.tasks
      .filter((t) => t.dueAt)
      .map((t) => ({ id: `t-${t.id}`, date: t.dueAt!.slice(0, 10), label: t.title, kind: t.priority })) ?? []),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = events.filter((e) => e.date >= now.toISOString().slice(0, 10)).slice(0, 12);

  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Calendar"
        subtitle="Renewals, launches, maintenance, term dates. Every asset expiry and task due date appears here."
        rangeDefault="90d"
      />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data && events.length === 0 && (
          <OpsEmpty title="No upcoming dates" body="Add domains, TLS and licences under Assets, or due dates on tasks. Term dates appear when the product ingests them." />
        )}
        {events.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Panel title={`${now.toLocaleString("en-GB", { month: "long", year: "numeric" })}`}>
              <MonthCalendar year={now.getUTCFullYear()} month={now.getUTCMonth()} events={events} />
            </Panel>
            <Panel title="Next 30 days">
              <ul className="space-y-2 text-sm">
                {upcoming.length === 0 && <li className="text-text-tertiary">Nothing in the next 30 days.</li>}
                {upcoming.map((i) => (
                  <li key={i.id} className="rounded-lg border border-card-border px-3 py-2">
                    <span className="font-mono text-xs">{i.date}</span>
                    <span className="ml-2 text-xs uppercase text-text-tertiary">{i.kind}</span>
                    <span className="ml-2">{i.label}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
