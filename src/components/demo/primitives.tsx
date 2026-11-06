import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DemoBadgeTone = "success" | "warning" | "error" | "purple" | "neutral";

const demoBadgeToneClasses: Record<DemoBadgeTone, string> = {
  success: "bg-badge-success-background text-badge-success-text [&>svg]:text-badge-success-icon-color",
  warning: "bg-badge-warning-background text-badge-warning-text [&>svg]:text-badge-warning-icon-color",
  error: "bg-badge-error-background text-badge-error-text [&>svg]:text-badge-error-icon-color",
  purple: "bg-badge-purple-background text-badge-purple-text [&>svg]:text-badge-purple-icon-color",
  neutral: "bg-badge-neutral-background text-badge-neutral-text [&>svg]:text-badge-neutral-icon-color",
};

const tableGridCols: Record<string, string> = {
  "1fr_100px_96px": "grid-cols-[1fr_100px_96px]",
  "1fr_120px_96px_96px": "grid-cols-[1fr_120px_96px_96px]",
};

export function DemoPage({ children }: { children: ReactNode }) {
  return <div className="mt-6 space-y-5">{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="px-2 lg:px-6">
      {action ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
            {subtitle ? <p className="text-sm leading-5 text-text-tertiary">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
          {subtitle ? <p className="text-sm leading-5 text-text-tertiary">{subtitle}</p> : null}
        </>
      )}
    </div>
  );
}

export function DemoPageBody({ children }: { children: ReactNode }) {
  return <div className="space-y-5 px-2 lg:px-5">{children}</div>;
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-1 rounded-[14px] bg-background-gray-secondary_alt_2 p-1 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
  deltaTone = "flat",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  delta?: string;
  deltaLabel?: string;
  deltaTone?: "up" | "down" | "flat";
}) {
  return (
    <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm leading-5 font-medium tracking-[-0.15px] text-text-tertiary">{label}</p>
        {icon ? <span>{icon}</span> : null}
      </div>
      <h2 className="mb-1 text-xl font-semibold tracking-[-0.2px] text-text-primary md:text-2xl md:leading-8">{value}</h2>
      {delta ? (
        <p className="flex items-center gap-1">
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-medium tracking-[-0.15px]",
              deltaTone === "up" && "text-green-600",
              deltaTone === "down" && "text-red-600",
              deltaTone === "flat" && "text-text-tertiary",
            )}
          >
            {delta}
            {deltaTone === "up" ? <DeltaUpIcon /> : deltaTone === "down" ? <DeltaDownIcon /> : null}
          </span>
          {deltaLabel ? <span className="text-sm leading-5 tracking-[-0.15px] text-text-tertiary">{deltaLabel}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

export function DemoCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border-[0.5px] border-card-border bg-card-background p-5", className)}>{children}</div>;
}

export function CardHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-5">
      <h3 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">{title}</h3>
      {action}
    </div>
  );
}

export function CardMenuButton({ label }: { label?: string }) {
  return (
    <button type="button" aria-label={label} className="outline-none flex size-7 items-center justify-center rounded-lg duration-300 hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2">
      <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M5.83333 10.0002C5.83333 10.9206 5.08714 11.6668 4.16667 11.6668C3.24619 11.6668 2.5 10.9206 2.5 10.0002C2.5 9.07969 3.24619 8.3335 4.16667 8.3335C5.08714 8.3335 5.83333 9.07969 5.83333 10.0002Z"
          fill="currentColor"
        />
        <path
          d="M11.6667 10.0002C11.6667 10.9206 10.9205 11.6668 10 11.6668C9.07953 11.6668 8.33333 10.9206 8.33333 10.0002C8.33333 9.07969 9.07953 8.3335 10 8.3335C10.9205 8.3335 11.6667 9.07969 11.6667 10.0002Z"
          fill="currentColor"
        />
        <path
          d="M17.5 10.0002C17.5 10.9206 16.7538 11.6668 15.8333 11.6668C14.9129 11.6668 14.1667 10.9206 14.1667 10.0002C14.1667 9.07969 14.9129 8.3335 15.8333 8.3335C16.7538 8.3335 17.5 9.07969 17.5 10.0002Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

export function CardMenuDots() {
  return (
    <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg">
      <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M5.83333 10.0002C5.83333 10.9206 5.08714 11.6668 4.16667 11.6668C3.24619 11.6668 2.5 10.9206 2.5 10.0002C2.5 9.07969 3.24619 8.3335 4.16667 8.3335C5.08714 8.3335 5.83333 9.07969 5.83333 10.0002Z"
          fill="currentColor"
        />
        <path
          d="M11.6667 10.0002C11.6667 10.9206 10.9205 11.6668 10 11.6668C9.07953 11.6668 8.33333 10.9206 8.33333 10.0002C8.33333 9.07969 9.07953 8.3335 10 8.3335C10.9205 8.3335 11.6667 9.07969 11.6667 10.0002Z"
          fill="currentColor"
        />
        <path
          d="M17.5 10.0002C17.5 10.9206 16.7538 11.6668 15.8333 11.6668C14.9129 11.6668 14.1667 10.9206 14.1667 10.0002C14.1667 9.07969 14.9129 8.3335 15.8333 8.3335C16.7538 8.3335 17.5 9.07969 17.5 10.0002Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function MetricHead({ title, value, subtitle, action }: { title: string; value: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative mb-6 flex w-full flex-col flex-wrap items-start justify-between gap-6 sm:flex-row">
      <div>
        <p className="text-sm leading-6 font-medium tracking-[-0.2px] text-text-tertiary">{title}</p>
        <div className="text-3xl leading-8 font-semibold text-text-primary">{value}</div>
        {subtitle ? <p className="text-sm leading-5 tracking-[-0.15px] text-text-tertiary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DemoBadge({ tone, children }: { tone: DemoBadgeTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full font-medium [&>svg]:size-3 py-0.5 text-xs px-2 capitalize", demoBadgeToneClasses[tone])}>
      {children}
    </span>
  );
}

export function DemoTableHeader({ cols, bordered, children }: { cols: keyof typeof tableGridCols; bordered?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        `grid ${tableGridCols[cols]} gap-4 text-sm leading-5 font-medium tracking-[-0.15px] text-text-tertiary`,
        bordered && "border-y border-border-secondary-alt px-4 py-2.5",
      )}
    >
      {children}
    </div>
  );
}

export function DemoTableRows({ bordered, children }: { bordered?: boolean; children: ReactNode }) {
  return <div className={cn("mt-3.5 space-y-2", bordered && "px-2 pb-2")}>{children}</div>;
}

export function DemoTableRow({ cols, bar, children }: { cols: keyof typeof tableGridCols; bar?: number; children: ReactNode }) {
  return (
    <div
      className={cn(
        `grid ${tableGridCols[cols]} items-center gap-4 px-2 py-1.5 text-sm leading-5 font-medium tracking-[-0.15px] text-text-primary`,
        bar != null && "relative [&>*:not(:first-child)]:z-10",
      )}
    >
      {bar != null ? <div className="absolute inset-y-0 left-0 rounded-lg bg-background-gray-secondary_alt" style={{ width: `${bar}%` }} /> : null}
      {children}
    </div>
  );
}

export function DemoTimeline({ children }: { children: ReactNode }) {
  return <div className="text-text-primary mt-3.5 p-0">{children}</div>;
}

export function DemoTimelineRow({ icon, text, time }: { icon: ReactNode; text: string; time: string }) {
  return (
    <div className="grid grid-cols-[36px_1fr_100px] items-center gap-4 px-2 py-3 text-sm leading-5 font-medium tracking-[-0.15px] text-text-primary">
      <span className="flex size-9 items-center justify-center rounded-md bg-background-gray-secondary_alt">{icon}</span>
      <span className="min-w-0 truncate max-sm:max-w-52">{text}</span>
      <span className="truncate text-right text-text-tertiary">{time}</span>
    </div>
  );
}

export function DemoLegendGroup({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col justify-center divide-y divide-dashed divide-border-secondary-alt p-0 *:py-3 sm:gap-x-7">{children}</div>;
}

export function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between last-of-type:pb-0">
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="text-sm leading-5 font-medium text-text-secondary capitalize">{label}</span>
      </span>
      <span className="text-sm leading-0 font-medium tracking-[-0.15px] text-text-primary">{value}</span>
    </p>
  );
}

export function DeltaUpIcon() {
  return (
    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 13.3332L8 2.6665M4 6.6665L8 2.6665L12 6.6665" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DeltaDownIcon() {
  return (
    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 2.6665L8 13.3332M4 9.33317L8 13.3332L12 9.33317" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentSmileyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
      <rect x="1.1" y="1.1" width="15.8" height="15.8" rx="4.4" fill="#3B82F6" fillOpacity="0.15" />
      <rect x="1.1" y="1.1" width="15.8" height="15.8" rx="4.4" stroke="#3B82F6" strokeWidth="1.2" />
      <path
        d="M6.875 11.8335C7.47735 12.28 8.2099 12.5418 9 12.5418C9.7901 12.5418 10.5227 12.28 11.125 11.8335"
        stroke="#3B82F6"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <mask id="path-3-inside-1_23782_65438" fill="white">
        <ellipse cx="11.1253" cy="7.9375" rx="0.708333" ry="1.0625" />
      </mask>
      <ellipse cx="11.1253" cy="7.9375" rx="0.708333" ry="1.0625" fill="#F97316" fillOpacity="0.1" />
      <path
        d="M11.8337 7.9375H10.8337C10.8337 7.99493 10.8258 8.04324 10.8155 8.07968C10.8105 8.09764 10.8052 8.11134 10.8009 8.12089C10.7966 8.13053 10.7938 8.13463 10.7941 8.1341C10.7944 8.13365 10.799 8.12689 10.8096 8.11615C10.8202 8.1054 10.8382 8.08928 10.8653 8.07211C10.9226 8.03579 11.0129 8 11.1253 8V9V10C11.7593 10 12.2109 9.61456 12.4582 9.2435C12.7103 8.86545 12.8337 8.40079 12.8337 7.9375H11.8337ZM11.1253 9V8C11.2377 8 11.3281 8.03579 11.3853 8.07211C11.4124 8.08928 11.4305 8.1054 11.4411 8.11615C11.4517 8.12689 11.4562 8.13365 11.4565 8.1341C11.4569 8.13463 11.4541 8.13053 11.4498 8.12089C11.4454 8.11134 11.4402 8.09764 11.4351 8.07968C11.4249 8.04324 11.417 7.99493 11.417 7.9375H10.417H9.41699C9.41699 8.40079 9.54038 8.86545 9.79241 9.2435C10.0398 9.61456 10.4913 10 11.1253 10V9ZM10.417 7.9375H11.417C11.417 7.88007 11.4249 7.83176 11.4351 7.79532C11.4402 7.77736 11.4454 7.76366 11.4498 7.75411C11.4541 7.74447 11.4569 7.74037 11.4565 7.7409C11.4562 7.74135 11.4517 7.74811 11.4411 7.75885C11.4305 7.7696 11.4124 7.78572 11.3853 7.80289C11.3281 7.83921 11.2377 7.875 11.1253 7.875V6.875V5.875C10.4913 5.875 10.0398 6.26044 9.79241 6.6315C9.54038 7.00955 9.41699 7.47421 9.41699 7.9375H10.417ZM11.1253 6.875V7.875C11.0129 7.875 10.9226 7.83921 10.8653 7.80289C10.8382 7.78572 10.8202 7.7696 10.8096 7.75885C10.799 7.74811 10.7944 7.74135 10.7941 7.7409C10.7938 7.74037 10.7966 7.74447 10.8009 7.75411C10.8052 7.76366 10.8105 7.77736 10.8155 7.79532C10.8258 7.83176 10.8337 7.88007 10.8337 7.9375H11.8337H12.8337C12.8337 7.47421 12.7103 7.00955 12.4582 6.6315C12.2109 6.26044 11.7593 5.875 11.1253 5.875V6.875Z"
        fill="#3B82F6"
        mask="url(#path-3-inside-1_23782_65438)"
      />
      <ellipse cx="6.87533" cy="7.9375" rx="0.708333" ry="1.0625" fill="#3B82F6" />
    </svg>
  );
}
