"use client";

import { RangeControl } from "@/components/ops/RangeControl";
import { StatusBadge } from "@/components/ops/StatusBadge";
import type { HealthStatus, RangeKey } from "@/lib/ops/types";

export function ProjectHeader({
  title,
  subtitle,
  status,
  stage,
  rangeDefault = "30d",
}: {
  title: string;
  subtitle: string;
  status?: HealthStatus;
  stage?: string;
  rangeDefault?: RangeKey;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-2 lg:px-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
          {status && <StatusBadge status={status} />}
          {stage && <span className="text-xs uppercase text-text-tertiary">{stage}</span>}
        </div>
        <p className="text-sm text-text-tertiary">{subtitle}</p>
      </div>
      <RangeControl fallback={rangeDefault} />
    </div>
  );
}
