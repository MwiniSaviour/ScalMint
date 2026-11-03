"use client";

import type { FormEvent, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

export const fieldClass =
  "mt-1 w-full rounded-lg border border-card-border bg-transparent px-3 py-2 text-sm text-text-primary";

export function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-xl border border-card-border bg-card-background p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-text-primary">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm text-text-secondary ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function useOpsCommand(invalidate: unknown[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await opsFetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: body.type === "check.test" ? 20000 : 8000,
      });
      if (!res.ok) throw new Error(res.error ?? "Command failed");
      return res.data as Record<string, unknown>;
    },
    onSuccess: () => {
      for (const key of invalidate) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function CommandForm({
  children,
  onSubmit,
  pending,
  error,
  submitLabel = "Save",
}: {
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
}) {
  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      {children}
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm" isDisabled={pending}>
          {submitLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-error-500 md:col-span-2">{error}</p>}
    </form>
  );
}

export function formDataOf(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const out: Record<string, string> = {};
  data.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}
