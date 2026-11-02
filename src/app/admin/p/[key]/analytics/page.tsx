"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { Uninstrumented } from "@/components/ops/Uninstrumented";
import { OpsSkeleton } from "@/components/ops/PageStates";

export default function AnalyticsPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-project", key],
    queryFn: async () => {
      const res = await opsFetch<{ project: { firstValueEvent: string | null } }>(`/api/admin/projects/${key}`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.project;
    },
  });
  if (q.isLoading) return <OpsSkeleton />;
  const eventName = q.data?.firstValueEvent ?? "project.first_value";
  return (
    <div className="space-y-5">
      <ProjectHeader
        title="Analytics"
        subtitle="Activation, retention and AI. Changing the range recomputes from facts — never client-side averages."
      />
      <div className="px-2 lg:px-5">
        <Uninstrumented title="Usage and activation" eventName={eventName} source="ingest type=metric|ai" />
      </div>
    </div>
  );
}
