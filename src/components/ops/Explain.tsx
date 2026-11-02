"use client";

import { useState } from "react";
import type { MetricView } from "@/lib/ops/types";

export function Explain({ metric }: { metric: MetricView }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:bg-background-gray-primary hover:text-text-primary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Explain
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`Explain ${metric.label}`}
          className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-card-border bg-card-background p-3 text-xs text-text-secondary shadow-xs"
        >
          <p className="font-medium text-text-primary">Formula</p>
          <p className="mt-1 leading-5">{metric.formula}</p>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between gap-2">
              <dt>Window</dt>
              <dd>{metric.window}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Source</dt>
              <dd>{metric.source}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Quality</dt>
              <dd>{metric.quality}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>As of</dt>
              <dd>{metric.asOf ?? "—"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
