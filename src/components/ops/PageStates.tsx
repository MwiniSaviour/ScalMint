export function OpsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 px-2 lg:px-5" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl border border-card-border bg-background-gray-secondary" />
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

export function OpsEmpty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-card-border bg-card-background p-8 text-center">
      <p className="text-base font-medium text-text-primary">{title}</p>
      <p className="mt-2 text-sm text-text-tertiary">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function OpsError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-badge-error-background bg-card-background p-6" role="alert">
      <p className="text-sm font-medium text-text-primary">Could not load this surface</p>
      <p className="mt-1 text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-button-primary-background px-3 py-1.5 text-sm text-button-primary-text"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ArchivedBanner({ onRestore }: { onRestore?: () => void }) {
  return (
    <div className="mx-2 rounded-lg border border-badge-warning-background bg-badge-warning-background px-4 py-3 text-sm text-badge-warning-text lg:mx-5">
      This project is archived. Facts are retained. Restore to make it writable again.
      {onRestore && (
        <button type="button" className="ml-3 underline" onClick={onRestore}>
          Restore
        </button>
      )}
    </div>
  );
}
