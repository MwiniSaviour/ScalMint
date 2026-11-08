"use client";

import { useEffect } from "react";

export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-xl border-[0.5px] border-card-border bg-card-background p-8 text-center"
    >
      <div className="max-w-md">
        <h2 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm leading-5 tracking-[-0.15px] text-text-secondary">
          This page failed to load. Retrying may help if the failure was temporary.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs leading-4 text-text-tertiary">Error ID: {error.digest}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white outline-none duration-300 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2"
      >
        Retry
      </button>
    </div>
  );
}
