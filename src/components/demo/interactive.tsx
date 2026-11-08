"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

export function ToastAction({
  message,
  tone = "info",
  ariaLabel = "Show message",
  title,
  disabled = false,
  disabledTitle,
  className,
  children,
}: {
  message: string;
  tone?: "info" | "error" | "warning";
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  disabledTitle?: string;
  className: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <button type="button" disabled aria-disabled="true" aria-label={title ?? disabledTitle ?? ariaLabel} title={disabledTitle ?? title ?? ariaLabel} className={className}>
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={() => {
        if (tone === "error") toast.error(message);
        else if (tone === "warning") toast.warning(message);
        else toast.info(message);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

export function KitTabs({
  labels,
  defaultValue,
  ariaLabel,
  className,
}: {
  labels: readonly string[];
  defaultValue?: string;
  ariaLabel: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultValue ?? labels[0]);
  return (
    <div role="tablist" aria-label={ariaLabel} className={className ?? "flex items-center gap-1 rounded-lg border-none bg-tab-background p-1"}>
      {labels.map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={active === l}
          onClick={() => setActive(l)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 ${
            active === l
              ? "bg-tab-active-background text-text-primary shadow-xs"
              : "text-text-tertiary hover:text-text-primary"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
