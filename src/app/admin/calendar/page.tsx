"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DemoCard,
  DemoPage,
  DemoPageBody,
  PageHeader,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 15.4166L12.5 9.99998L7.5 4.58331" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.58335L7.5 10L12.5 15.4167" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconButton({ children, className, ariaLabel, onClick }: { children: ReactNode; className?: string; ariaLabel: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={["flex items-center justify-center rounded-lg size-9.5 text-sm font-medium transition outline-none focus:ring-4 border border-button-primary-outline-stroke bg-button-primary-outline-background text-button-primary-outline-text hover:text-button-primary-outline-hover-text hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 [&>svg]:text-current! [&>svg]:size-5", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, className, onClick }: { children: ReactNode; className?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 bg-button-primary-background text-button-primary-text hover:bg-button-primary-hover-background focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring focus-visible:ring-offset-2 gap-1.5 px-3.5 py-2 h-9", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

const CAL_VIEWS = ["Month", "Week", "Day", "Year"] as const;
type CalView = (typeof CAL_VIEWS)[number];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function advance(cursor: Date, view: CalView, dir: 1 | -1): Date {
  const next = new Date(cursor);
  if (view === "Month") next.setMonth(next.getMonth() + dir);
  else if (view === "Week") next.setDate(next.getDate() + dir * 7);
  else if (view === "Day") next.setDate(next.getDate() + dir);
  else next.setFullYear(next.getFullYear() + dir);
  return next;
}

function MonthGrid({ cursor }: { cursor: Date }) {
  const today = new Date();
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return (
    <div className="grid grid-cols-7 border-t border-l border-card-border">
      {cells.map((d, i) => {
        const dimmed = d.getMonth() !== cursor.getMonth();
        return (
          <div
            key={i}
            suppressHydrationWarning
            className={`flex h-13.5 items-start justify-end border-r border-b border-card-border p-1.5 text-sm ${
              isToday(d)
                ? "bg-tab-active-background font-semibold text-text-primary"
                : dimmed
                  ? "text-text-tertiary"
                  : "text-text-secondary"
            }`}
          >
            {d.getDate()}
          </div>
        );
      })}
    </div>
  );
}

function rangeLabel(cursor: Date, view: CalView): string {
  const year = cursor.getFullYear();
  if (view === "Month") return `${MONTHS[cursor.getMonth()]} ${year}`;
  if (view === "Year") return String(year);
  if (view === "Day") {
    return cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const start = new Date(cursor);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `Week of ${fmt.format(start)} – ${fmt.format(end)}, ${year}`;
}

export default function Page() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [view, setView] = useState<CalView>("Month");
  const [cursor, setCursor] = useState(() => new Date());
  const label = useMemo(() => rangeLabel(cursor, view), [cursor, view]);
  return (
    <DemoPage>
      <PageHeader title="Calendar" subtitle="View and manage scheduled events across months, weeks, and days." />
      <DemoPageBody>
        <DemoCard>
          <div className="flex flex-col items-center justify-between gap-4 border-b border-card-border p-4 sm:flex-row sm:p-5">
            <div className="flex w-full items-center justify-between gap-5 sm:w-auto sm:justify-start">
              <div className="flex items-center gap-3">
                <IconButton ariaLabel="Previous period" onClick={() => setCursor((c) => advance(c, view, -1))}><ChevronLeft /></IconButton>
                <IconButton ariaLabel="Next period" onClick={() => setCursor((c) => advance(c, view, 1))}><ChevronRight /></IconButton>
                <p suppressHydrationWarning className="tracking-[-0.2px] text-base leading-6 font-semibold text-text-primary">{label}</p>
              </div>
              <div role="tablist" aria-label="Calendar view" className="flex items-center rounded-lg bg-tab-background p-1">
                {CAL_VIEWS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 ${view === v ? "bg-tab-active-background text-text-primary shadow-xs" : "text-text-tertiary hover:text-text-primary"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <PrimaryButton onClick={() => toast.info("No calendar source is connected yet — events can’t be created until one is added.")}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M8.62952 3.66602C8.9866 3.66625 9.27675 3.95639 9.27698 4.31348V7.98145H12.944C13.3012 7.98169 13.5905 8.27163 13.5905 8.62891C13.5903 8.98601 13.3011 9.27613 12.944 9.27637H9.27698V12.9434C9.27674 13.3004 8.98659 13.5896 8.62952 13.5898C8.27224 13.5898 7.9823 13.3006 7.98206 12.9434V9.27637H4.31409C3.95694 9.27618 3.66682 8.98605 3.66663 8.62891C3.66663 8.2716 3.95682 7.98163 4.31409 7.98145H7.98206V4.31348C7.98228 3.95625 8.27223 3.66602 8.62952 3.66602Z" fill="currentColor" />
                </svg>
                Add Event
              </PrimaryButton>
            </div>
          </div>
          <div className="p-4 pt-0 sm:p-5">
            <div className="w-full overflow-hidden rounded-xl border border-card-border bg-card-background">
              {view === "Month" ? (
                <>
                  <div className="grid grid-cols-7 border-b border-card-border bg-tab-background py-3 text-center">
                    {days.map((day) => (
                      <div key={day} className="text-xs font-semibold text-text-tertiary">
                        {day}
                      </div>
                    ))}
                  </div>
                  <MonthGrid cursor={cursor} />
                  <div className="border-t border-dashed border-card-border py-3 text-center">
                    <p className="text-sm font-medium text-text-secondary">No events in {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
                    <p className="mt-0.5 text-xs text-text-tertiary">No calendar data source is connected. Events appear here once one is connected.</p>
                  </div>
                </>
              ) : (
                <div className="flex h-[340px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-card-border bg-card-background">
                  <p className="text-sm font-medium text-text-secondary">No events</p>
                  <p className="mt-1 max-w-72 text-center text-sm text-text-tertiary">No calendar data source is connected. Events for this {view.toLowerCase()} would appear here.</p>
                </div>
              )}
            </div>
          </div>
        </DemoCard>
      </DemoPageBody>
    </DemoPage>
  );
}
