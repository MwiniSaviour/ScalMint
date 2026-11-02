"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/nextadmin/components/tailgrids/core/card";
import type { MetricView } from "@/lib/ops/types";
import { Explain } from "@/components/ops/Explain";

export function MetricCard({ metric }: { metric: MetricView }) {
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <p className="text-sm font-medium text-text-primary">{metric.label}</p>
          <p className="text-xs text-text-tertiary">
            {metric.unit} · {metric.window}
          </p>
        </div>
        <Explain metric={metric} />
      </CardHeader>
      <CardContent className="mt-4 p-0">
        <p className="font-mono text-2xl leading-8 font-semibold tabular-nums text-text-primary">{metric.display}</p>
        {metric.quality === "STALE" && (
          <p className="mt-1 text-xs text-badge-warning-text">Stale — last success {metric.asOf ?? "unknown"}</p>
        )}
        {metric.quality === "UNKNOWN" && <p className="mt-1 text-xs text-text-tertiary">Not instrumented</p>}
      </CardContent>
      <CardFooter className="mt-3 flex justify-between p-0 text-xs text-text-tertiary">
        <span>Source: {metric.source}</span>
        <span>as of {metric.asOf ? metric.asOf.replace("T", " ").slice(0, 16) : "—"} UTC</span>
      </CardFooter>
    </Card>
  );
}
