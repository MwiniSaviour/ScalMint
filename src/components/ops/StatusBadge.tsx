import { cn } from "@/nextadmin/utils/cn";
import type { HealthStatus } from "@/lib/ops/types";
import { statusLabel } from "@/lib/ops/status";

const styles: Record<HealthStatus, string> = {
  UP: "bg-badge-success-background text-badge-success-text",
  DEGRADED: "bg-badge-warning-background text-badge-warning-text",
  DOWN: "bg-badge-error-background text-badge-error-text",
  UNKNOWN: "bg-badge-neutral-background text-badge-neutral-text",
};

export function StatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
