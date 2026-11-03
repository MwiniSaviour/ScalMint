"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsEmpty, OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { MonthCalendar, type CalEvent } from "@/components/ops/MonthCalendar";
import { Panel } from "@/components/ops/forms";

type Asset = {
  id: string;
  name: string;
  kind: string;
  expiresAt: string | null;
  projectKey?: string;
  projectName?: string;
};
type Task = { id: string; title: string; dueAt: string | null; priority: string; projectKey?: string | null };

export default function PortfolioCalendarPage() {
  const now = useMemo(() => new Date(), []);
  const q = useQuery({
    queryKey: ["ops-portfolio-surface", "calendar"],
    queryFn: async () => {
      const res = await opsFetch<{ assets: Asset[]; tasks: Task[] }>("/api/admin/portfolio/surfaces?name=calendar");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  const events: CalEvent[] = [
    ...(q.data?.assets
      .filter((a) => a.expiresAt)
      .map((a) => ({
        id: `a-${a.id}`,
        date: a.expiresAt!.slice(0, 10),
        label: `${a.projectName ?? ""} · ${a.name}`,
        kind: a.kind,
      })) ?? []),
    ...(q.data?.tasks
      .filter((t) => t.dueAt)
      .map((t) => ({
        id: `t-${t.id}`,
        date: t.dueAt!.slice(0, 10),
        label: t.title,
        kind: t.priority,
      })) ?? []),
  ];

  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div>
        <h1 className="text-[28px] leading-8 font-medium text-text-primary">Calendar</h1>
        <p className="text-sm text-text-tertiary">Renewals and due work across the portfolio for the next 90 days.</p>
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && events.length === 0 && (
        <OpsEmpty title="No upcoming dates" body="Register assets or due dates on tasks. This is an empty calendar, not a healthy one." />
      )}
      {events.length > 0 && (
        <Panel
          title={now.toLocaleString("en-GB", { month: "long", year: "numeric" })}
          aside={
            <Link href="/admin/task" className="text-xs underline">
              Tasks
            </Link>
          }
        >
          <MonthCalendar year={now.getUTCFullYear()} month={now.getUTCMonth()} events={events} />
        </Panel>
      )}
    </div>
  );
}
