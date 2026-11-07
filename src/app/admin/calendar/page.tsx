import type { ReactNode } from "react";
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

function IconButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={["flex items-center justify-center rounded-lg size-9.5 text-sm font-medium transition outline-none focus:ring-4 border border-button-primary-outline-stroke bg-button-primary-outline-background text-button-primary-outline-text hover:text-button-primary-outline-hover-text hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 [&>svg]:text-current! [&>svg]:size-5", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 bg-button-primary-background text-button-primary-text hover:bg-button-primary-hover-background focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring focus-visible:ring-offset-2 gap-1.5 px-3.5 py-2 h-9", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

export default function Page() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <DemoPage>
      <PageHeader title="Calendar" subtitle="View and manage scheduled events across months, weeks, and days." />
      <DemoPageBody>
        <DemoCard>
          <div className="flex flex-col items-center justify-between gap-4 border-b border-card-border p-4 sm:flex-row sm:p-5">
            <div className="flex w-full items-center justify-between gap-5 sm:w-auto sm:justify-start">
              <div className="flex items-center gap-3">
                <IconButton><ChevronLeft /></IconButton>
                <IconButton><ChevronRight /></IconButton>
                <p className="tracking-[-0.2px] text-base leading-6 font-semibold text-text-primary">Calendar</p>
              </div>
              <div role="tablist" aria-label="Calendar view" className="flex items-center rounded-lg bg-tab-background p-1">
                <button type="button" role="tab" aria-selected={true} className="rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 bg-tab-active-background text-text-primary shadow-xs">Month</button>
                <button type="button" role="tab" aria-selected={false} className="rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 text-text-tertiary hover:text-text-primary">Week</button>
                <button type="button" role="tab" aria-selected={false} className="rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 text-text-tertiary hover:text-text-primary">Day</button>
                <button type="button" role="tab" aria-selected={false} className="rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 text-text-tertiary hover:text-text-primary">Year</button>
              </div>
              <PrimaryButton>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M8.62952 3.66602C8.9866 3.66625 9.27675 3.95639 9.27698 4.31348V7.98145H12.944C13.3012 7.98169 13.5905 8.27163 13.5905 8.62891C13.5903 8.98601 13.3011 9.27613 12.944 9.27637H9.27698V12.9434C9.27674 13.3004 8.98659 13.5896 8.62952 13.5898C8.27224 13.5898 7.9823 13.3006 7.98206 12.9434V9.27637H4.31409C3.95694 9.27618 3.66682 8.98605 3.66663 8.62891C3.66663 8.2716 3.95682 7.98163 4.31409 7.98145H7.98206V4.31348C7.98228 3.95625 8.27223 3.66602 8.62952 3.66602Z" fill="currentColor" />
                </svg>
                Add Event
              </PrimaryButton>
            </div>
          </div>
          <div className="p-4 pt-0 sm:p-5">
            <div className="w-full overflow-hidden rounded-xl border border-card-border bg-card-background">
              <div className="grid grid-cols-7 border-b border-card-border bg-tab-background py-3 text-center">
                {days.map((day) => (
                  <div key={day} className="text-xs font-semibold text-text-tertiary">
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex h-[340px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-card-border bg-card-background">
                <p className="text-sm font-medium text-text-secondary">No events</p>
                <p className="mt-1 max-w-72 text-center text-sm text-text-tertiary">No calendar data source is connected. Events appear here once a calendar source is connected.</p>
              </div>
            </div>
          </div>
        </DemoCard>
      </DemoPageBody>
    </DemoPage>
  );
}
