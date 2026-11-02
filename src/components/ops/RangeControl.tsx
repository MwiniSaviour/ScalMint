"use client";

import { Suspense } from "react";
import { RANGE_KEYS, type RangeKey } from "@/lib/ops/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function RangeControl({ fallback = "30d" }: { fallback?: RangeKey }) {
  return (
    <Suspense fallback={<div className="h-7" />}>
      <RangeControlInner fallback={fallback} />
    </Suspense>
  );
}

function RangeControlInner({ fallback = "30d" }: { fallback?: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get("range") as RangeKey) || fallback;

  function setRange(range: RangeKey) {
    const next = new URLSearchParams(params.toString());
    next.set("range", range);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Time range">
      {RANGE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setRange(key)}
          className={`rounded-md px-2 py-1 text-xs font-medium uppercase ${
            current === key
              ? "bg-background-gray-secondary text-text-primary"
              : "text-text-tertiary hover:text-text-primary"
          }`}
          aria-pressed={current === key}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
