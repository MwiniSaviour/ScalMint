"use client";

import type { ReactNode } from "react";

export function Kanban<T extends { id: string }>({
  columns,
  items,
  statusOf,
  onMove,
  renderCard,
  movingId,
}: {
  columns: { id: string; label: string }[];
  items: T[];
  statusOf: (item: T) => string;
  onMove: (item: T, next: string) => void;
  renderCard: (item: T, move: (next: string) => void) => ReactNode;
  movingId?: string | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {columns.map((col, idx) => {
        const mine = items.filter((item) => statusOf(item) === col.id);
        const terminal = new Set(["WON", "LOST", "DONE", "CANCELLED"]);
        const prev = columns[idx - 1]?.id;
        const next = columns[idx + 1]?.id;
        const showPrev = Boolean(prev) && !terminal.has(col.id);
        const showNext = Boolean(next) && !terminal.has(col.id) && !terminal.has(next!);
        return (
          <div key={col.id} className="rounded-xl border border-card-border bg-card-background p-3">
            <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              {col.label} · {mine.length}
            </p>
            <ul className="mt-2 space-y-2">
              {mine.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg bg-background-gray-primary p-2 text-sm ${movingId === item.id ? "opacity-60" : ""}`}
                >
                  {renderCard(item, (status) => onMove(item, status))}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {showPrev && prev && (
                      <button
                        type="button"
                        className="rounded border border-card-border px-1.5 py-0.5 text-[11px]"
                        onClick={() => onMove(item, prev)}
                      >
                        Back
                      </button>
                    )}
                    {showNext && next && (
                      <button
                        type="button"
                        className="rounded border border-card-border px-1.5 py-0.5 text-[11px]"
                        onClick={() => onMove(item, next)}
                      >
                        Next
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
