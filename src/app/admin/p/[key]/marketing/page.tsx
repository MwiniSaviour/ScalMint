"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { ProjectHeader } from "@/components/ops/ProjectHeader";
import { Uninstrumented } from "@/components/ops/Uninstrumented";
import { OpsSkeleton, OpsError } from "@/components/ops/PageStates";
import Link from "next/link";

export default function MarketingPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ["ops-surface", key, "marketing"],
    queryFn: async () => {
      const res = await opsFetch<{ attributions: unknown[] }>(`/api/admin/projects/${key}/surface?name=marketing`);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
  });
  return (
    <div className="space-y-5">
      <ProjectHeader title="Marketing" subtitle="Last-touch or self-reported source only — labelled, never multi-touch. Affiliate rows stay in the programme." />
      <div className="px-2 lg:px-5">
        {q.isLoading && <OpsSkeleton />}
        {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
        {q.data && q.data.attributions.length === 0 && (
          <Uninstrumented title="Attribution" eventName="CampaignAttribution" source="ingest or manual spend" />
        )}
        <p className="mt-4 text-sm">
          Affiliate performance for this product lives in the{" "}
          <Link className="underline" href="/admin/programme">
            programme
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
