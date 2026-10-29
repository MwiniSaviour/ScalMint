import Link from "next/link";
import { cn } from "@/lib/utils";

/* ============================================================================
   LAYOUT
   ========================================================================== */

/** 1200px content container with the measured 120px gutters. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("shell", className)}>{children}</div>;
}

/** Standard section rhythm (112px block padding). */
export function Section({
  className,
  id,
  children,
  ...rest
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section id={id} className={cn("section-pad relative", className)} {...rest}>
      {children}
    </section>
  );
}

/* ============================================================================
   TEXT
   ========================================================================== */

/** Mono eyebrow label — the system's signature small-caps marker. */
export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("t-eyebrow text-eyebrow", className)}>{children}</p>;
}

/** Section heading. Use t-h2 on desktop; it steps down responsively. */
export function Heading2({
  className,
  children,
  as: Tag = "h2",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return <Tag className={cn("t-h2-mobile md:t-h2", className)}>{children}</Tag>;
}

/* ============================================================================
   BUTTONS — 37px tall, 12px radius. NOT rounded-full; the long edges stay
   straight (measured corner radius 11-12px against a 37px height).

   NOTE: `btn-base` etc. are Tailwind @utility classes, which tailwind-merge
   does NOT deduplicate. You cannot override height/padding by passing a
   conflicting className here — it will silently lose. Compose with wrappers.
   ========================================================================== */

type ButtonVariant = "primary" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "btn-base btn-primary hover:btn-primary-hover",
  ghost: "btn-base btn-ghost hover:btn-ghost-hover",
};

function buttonClass(variant: ButtonVariant, className?: string) {
  return cn(buttonStyles[variant], className);
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}

/** Small uppercase "BETA" chip — mono, on #1A1A1A, radius 4, ~18px tall. */
export function BetaChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "t-eyebrow inline-flex h-[18px] items-center rounded-[4px] bg-surface-2 px-1.5 text-[9px] leading-none text-muted",
        className,
      )}
    >
      Beta
    </span>
  );
}

/** Mono category chip rendered as `[TEAM]`, `[AI]` — brackets included. */
export function CategoryChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("t-eyebrow text-eyebrow", className)}>
      [{children}]
    </span>
  );
}

/* ============================================================================
   PAGER — `01 —— 02 03 04`. Active = white + a 50px white rule; inactive
   #4A4A4A. Shared by S4, S5, S6 and S9 so the motif reads as one system.

   Semantics: these are carousel position controls, NOT tabs. `role="tablist"`
   would require aria-controls + a matching tabpanel per slide, which a
   cross-fading carousel has no reason to expose. Plain buttons inside a
   labelled group is the correct pattern.
   ========================================================================== */

export function Pager({
  count,
  active,
  className,
  onSelect,
  label = "Slides",
  labels,
  ids,
}: {
  count: number;
  /** Zero-based. */
  active: number;
  className?: string;
  onSelect?: (index: number) => void;
  /** Accessible name for the group. */
  label?: string;
  /** Optional per-slide accessible names, e.g. "Show Operasch". */
  labels?: string[];
  /** Optional slide element ids, used to build aria-controls. */
  ids?: string[];
}) {
  return (
    <div
      className={cn("flex items-center gap-4", className)}
      role="group"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, i) => {
        const isActive = i === active;

        if (!onSelect) {
          return (
            <span
              key={i}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "t-eyebrow tabular-nums transition-colors duration-150",
                isActive ? "text-hi" : "text-muted",
              )}
            >
              {String(i + 1).padStart(2, "0")}
              {isActive && (
                <span className="ml-4 inline-block h-px w-[50px] translate-y-[-3px] bg-hi align-middle" />
              )}
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={isActive ? "true" : undefined}
            aria-controls={ids?.[i]}
            aria-label={labels?.[i] ?? `Show slide ${i + 1} of ${count}`}
            className={cn(
              "t-eyebrow cursor-pointer tabular-nums transition-colors duration-150",
              isActive ? "text-hi" : "text-muted hover:text-body",
            )}
          >
            {String(i + 1).padStart(2, "0")}
            {isActive && (
              <span className="ml-4 inline-block h-px w-[50px] translate-y-[-3px] bg-hi align-middle" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
   ARROW — the ↗ glyph used on links throughout the system.
   ========================================================================== */

export function ArrowUpRight({
  className,
  size = 13,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M5 11L11 5M11 5H5.5M11 5V10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  );
}

/* ============================================================================
   IN-PLACE TEXT LINK — underlined, brightens on hover.
   ========================================================================== */

export function TextLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-muted underline decoration-line underline-offset-4 transition-colors hover:text-hi hover:decoration-hi",
        className,
      )}
    >
      {children}
    </Link>
  );
}
