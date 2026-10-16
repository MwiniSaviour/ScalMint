"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Home } from "lucide-react";

import { ArrowUpRight, Container, Heading2 } from "@/components/ui/primitives";
import { DURATION, EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ============================================================================
   S2 — FROM SCATTERED INPUT TO ONE OPERATING SYSTEM

   A five-step delivery timeline on the left drives a sticky figure on the
   right. The figure does not cross-fade or translate: every node is a single
   mounted element parked in an explicit percentage slot, so when the step
   changes the nodes physically leave their grid positions and fly into a new
   arrangement. Only `left / top / scale / opacity / filter` move — width is a
   property of the node, so nothing reflows mid-flight.

Step 0 (intake)  : two small cards over a row of three, a violet sparkle
                       fed by a pulse travelling the stem, and the document
                       it generates.
   Steps 1-4 (sync) : a status label, the mark, and a radial hub-and-spoke
                      network — six connectors out to sources scattered at
                      varying depths and opacities.

   Left track  : col-span-4  (H2 + <ol> timeline, 364px of content)
   Right track : col-span-8, sticky, figure 628px
   ========================================================================== */

const STEPS = [
  {
    title: "Scope the opportunity",
    body: "We read your logs, sit in on the calls, and pull the numbers that show how work actually moves. Everything we build after this sits on that baseline.",
  },
  {
    title: "Design the system",
    body: "One architecture, one data model, one set of interfaces. You see the whole shape before anyone writes code, and it stays cheap to change.",
  },
  {
    title: "Build and automate",
    body: "Web and mobile applications, the integrations behind them, and the repetitive steps that used to need a person. Shipped in slices you can use.",
  },
  {
    title: "Connect your data",
    body: "Whatever already lives in your tools gets pulled into one structured place, cleaned and labelled, so it can be queried instead of hunted for.",
  },
  {
    title: "Measure and improve",
    body: "We agree what success looks like before launch, then track it against that number. Each cycle decides what the next one is worth building.",
  },
] as const;

const STEP_COUNT = STEPS.length;

/* --- Figure stage ---------------------------------------------------------
   A fixed 628x560 design box. Every slot below is a percentage of this box and
   the connector <svg> reuses the same numbers as its viewBox, so node positions
   and spoke geometry live in one coordinate space at any rendered width. */
const STAGE_W = 628;
const STAGE_H = 560;

/** Card width as a share of the stage — 31% ≈ 195px at the design size. */
const CARD_W = 31;
/** Half-height used when hanging the intake verticals off a row card. */
const ROW_CARD_HALF = 43;

const px = (p: number) => (p / 100) * STAGE_W;
const py = (p: number) => (p / 100) * STAGE_H;

/* ============================================================================
   NODES
   ========================================================================== */

type NodeId = "survey" | "brief" | "inbox" | "calls" | "chat";

/** One hue per source, drawn from the token set — never a bare hex. */
type Tone = "teal" | "warm" | "blue" | "muted";

const TONE: Record<Tone, string> = {
  teal: "bg-brand-teal",
  warm: "bg-warm",
  blue: "bg-blue",
  muted: "bg-muted",
};

type NodeSpec = {
  id: NodeId;
  label: string;
  tone: Tone;
  variant: "graph" | "doc" | "rows";
  rows: readonly string[];
  /** Small progress pips under a `rows` card. */
  pips?: readonly number[];
};

/* Five sources, so the intake grid reads as 2 + 3 exactly like the reference
   and the network phase fans out on five spokes. */
const NODES: readonly NodeSpec[] = [
  {
    id: "survey",
    label: "Survey responses",
    tone: "teal",
    variant: "graph",
    rows: [],
  },
  {
    id: "brief",
    label: "Requirements.doc",
    tone: "blue",
    variant: "doc",
    rows: ["DOC · 12 PAGES"],
  },
  {
    id: "inbox",
    label: "Email inbox",
    tone: "warm",
    variant: "rows",
    rows: ["1,204 THREADS · 38 OPEN"],
    pips: [1, 1, 1, 0.4],
  },
  {
    id: "calls",
    label: "Discovery calls",
    tone: "muted",
    variant: "rows",
    rows: ["6 CALLS · 4H 12M"],
  },
  {
    id: "chat",
    label: "Support chat",
    tone: "teal",
    variant: "rows",
    rows: ["912 RESOLVED · 41 WAITING"],
  },
];

type Placement = { x: number; y: number; scale: number; opacity: number };
type Layout = Record<NodeId, Placement> & {
  hub: Placement;
  mark: Placement;
};

/* Step 0 — the intake grid: two small cards over a row of three, everything
   feeding one bus that drops into the sparkle.
   Steps 1-4 — the same five sources scattered around a hub, one source in
   focus per step and the rest pushed back into depth. */
const LAYOUTS: readonly Layout[] = [
  {
    survey: { x: 33.7, y: 10, scale: 1, opacity: 1 },
    brief: { x: 66.3, y: 10, scale: 1, opacity: 1 },
    inbox: { x: 17.4, y: 28, scale: 1, opacity: 1 },
    calls: { x: 50, y: 28, scale: 1, opacity: 1 },
    chat: { x: 82.6, y: 28, scale: 1, opacity: 1 },
    hub: { x: 50, y: 48, scale: 0.7, opacity: 0 },
    mark: { x: 50, y: 8, scale: 0.8, opacity: 0 },
  },
  {
    calls: { x: 46, y: 62, scale: 1, opacity: 1 },
    inbox: { x: 24, y: 54, scale: 0.88, opacity: 0.4 },
    chat: { x: 18, y: 74, scale: 0.84, opacity: 0.34 },
    brief: { x: 56, y: 86, scale: 0.94, opacity: 0.68 },
    survey: { x: 81, y: 68, scale: 0.86, opacity: 0.38 },
    hub: { x: 50, y: 46, scale: 1, opacity: 1 },
    mark: { x: 50, y: 19, scale: 1, opacity: 1 },
  },
  {
    calls: { x: 52, y: 62, scale: 1, opacity: 1 },
    inbox: { x: 20, y: 48, scale: 0.9, opacity: 0.42 },
    chat: { x: 24, y: 80, scale: 0.82, opacity: 0.32 },
    brief: { x: 78, y: 42, scale: 0.86, opacity: 0.38 },
    survey: { x: 70, y: 84, scale: 0.8, opacity: 0.3 },
    hub: { x: 50, y: 34, scale: 1, opacity: 1 },
    mark: { x: 50, y: 8, scale: 1, opacity: 1 },
  },
  {
    inbox: { x: 52, y: 62, scale: 1, opacity: 1 },
    calls: { x: 80, y: 50, scale: 0.9, opacity: 0.42 },
    survey: { x: 18, y: 46, scale: 0.84, opacity: 0.36 },
    brief: { x: 72, y: 78, scale: 0.82, opacity: 0.32 },
    chat: { x: 30, y: 80, scale: 0.8, opacity: 0.3 },
    hub: { x: 46, y: 36, scale: 1, opacity: 1 },
    mark: { x: 46, y: 10, scale: 1, opacity: 1 },
  },
  {
    chat: { x: 50, y: 64, scale: 1, opacity: 1 },
    calls: { x: 22, y: 50, scale: 0.88, opacity: 0.4 },
    inbox: { x: 78, y: 54, scale: 0.86, opacity: 0.38 },
    brief: { x: 20, y: 78, scale: 0.82, opacity: 0.32 },
    survey: { x: 78, y: 80, scale: 0.8, opacity: 0.3 },
    hub: { x: 50, y: 38, scale: 1, opacity: 1 },
    mark: { x: 50, y: 12, scale: 1, opacity: 1 },
  },
];

/** Sync captions for the four network phases — indexed by `step - 1`. */
const PHASE_LABEL = [
  "Syncing sources",
  "Drafting spec",
  "Wiring services",
  "Measuring impact",
] as const;

/* ============================================================================
   CONNECTOR GEOMETRY
   ========================================================================== */

/** Gentle arc: bow the control point perpendicular to the hub→node vector. */
function spoke(hx: number, hy: number, nx: number, ny: number): string {
  const dx = nx - hx;
  const dy = ny - hy;
  const len = Math.max(1, Math.hypot(dx, dy));
  const bow = Math.min(54, len * 0.2);
  const cx = (hx + nx) / 2 - (dy / len) * bow;
  const cy = (hy + ny) / 2 + (dx / len) * bow;
  return `M ${hx.toFixed(1)} ${hy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
}

/** Intake: the three row cards drop onto one bus, which feeds the sparkle. */
function intakePaths(layout: Layout): string[] {
  const BUS = py(41);
  const paths = NODES.filter((n) => layout[n.id].y > 20).map((n) => {
    const p = layout[n.id];
    const x = px(p.x);
    return `M ${x.toFixed(1)} ${(py(p.y) + ROW_CARD_HALF).toFixed(1)} L ${x.toFixed(1)} ${BUS.toFixed(1)}`;
  });
  paths.push(
    `M ${px(17.4).toFixed(1)} ${BUS.toFixed(1)} L ${px(82.6).toFixed(1)} ${BUS.toFixed(1)}`,
  );
  paths.push(
    `M ${px(50).toFixed(1)} ${BUS.toFixed(1)} L ${px(50).toFixed(1)} ${py(48).toFixed(1)}`,
  );
  return paths;
}

/** Network: five sources plus the mark card — six spokes off the hub. */
function networkPaths(layout: Layout): string[] {
  const hx = px(layout.hub.x);
  const hy = py(layout.hub.y);
  return [
    ...NODES.map((n) => spoke(hx, hy, px(layout[n.id].x), py(layout[n.id].y))),
    spoke(hx, hy, px(layout.mark.x), py(layout.mark.y)),
  ];
}

/* ============================================================================
   TRAVELLING NODE — the intake pulse

   The crisp run of the intake stem between the bus and the sparkle is short, so
   the travel is carried by an ease-out plus a bloom rather than by distance.
   Every number here is a stage percentage — the same space the connector
   <svg> viewBox and the node slots use — so the pulse stays welded to the line
   at any rendered width.
   ========================================================================== */

/** Stem x — the same `px(50)` the intake connector draws. */
const NODE_X = 50;
/** Where the pulse enters the line: on the bus. */
const NODE_START_Y = 41;
/** Where it comes to rest: on the sparkle's tip. `Sparkle` centres a 56px box
    on 48%, which puts its top edge on exactly 43% (240.8px of 560) — the node
    parks there, above the glyph and clear of the micro-label beside it. */
const NODE_REST_Y = 43;
/** 1.6% ≈ 10px across at the 628px design width. */
const NODE_SIZE = 1.6;
/** One loop: travel in, arrive, hold, fade, reset. */
const NODE_CYCLE = 2.2;
const NODE_TIMES = [0, 0.35, 0.66, 0.84, 1];

/** bus → rest → rest → rest → bus, the last leg running at zero alpha. */
const NODE_TOP = [
  `${NODE_START_Y}%`,
  `${NODE_REST_Y}%`,
  `${NODE_REST_Y}%`,
  `${NODE_REST_Y}%`,
  `${NODE_START_Y}%`,
];
const NODE_ALPHA = [0, 1, 1, 0, 0];
const NODE_SCALE = [0.55, 1.18, 1, 1, 0.55];

/* ============================================================================
   SUB-COMPONENTS
   ========================================================================== */

function NodeCard({
  node,
  placement,
  duration,
}: {
  node: NodeSpec;
  placement: Placement;
  duration: number;
}) {
  const outOfFocus = placement.opacity < 0.95;

  return (
    <motion.div
      aria-hidden="true"
      className="node-card absolute overflow-hidden px-[9px] py-[8px]"
      /* `translate` rather than `transform` so the centring offset and Framer's
         own transform stay independent. */
      style={{ translate: "-50% -50%", width: `${CARD_W}%` }}
      initial={false}
      animate={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        scale: placement.scale,
        opacity: placement.opacity,
        filter: outOfFocus ? "blur(1px)" : "blur(0px)",
      }}
      transition={{ duration, ease: EASE_EXPO }}
    >
      <div className="flex items-center gap-[6px]">
        <span
          className={cn(
            "h-[6px] w-[6px] shrink-0 rounded-[1px]",
            TONE[node.tone],
          )}
        />
        <span className="truncate font-mono text-[9px] uppercase leading-none tracking-[0.09em] text-body sm:text-[10px] lg:text-[11px]">
          {node.label}
        </span>
      </div>

      {node.variant === "graph" && (
        <div
          className="mt-[7px] h-[42px] w-full [background-image:linear-gradient(to_right,var(--color-wire)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-wire)_1px,transparent_1px)] [background-size:18px_18px] sm:h-[52px] lg:h-[58px]"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 80% at 50% 50%, #000, transparent 78%)",
            maskImage:
              "radial-gradient(ellipse 70% 80% at 50% 50%, #000, transparent 78%)",
          }}
        />
      )}

      {node.variant === "doc" && (
        <div className="mt-[7px] flex items-center gap-[7px]">
          <span className="h-[26px] w-[20px] shrink-0 rounded-[2px] bg-blue/25 ring-1 ring-line-node sm:h-[30px] lg:h-[34px]" />
          <span className="font-mono text-[8px] uppercase leading-[1.5] tracking-[0.08em] text-eyebrow sm:text-[9px]">
            {node.rows[0]}
          </span>
        </div>
      )}

      {node.variant === "rows" && (
        <>
          <div className="mt-[7px] space-y-[3px]">
            {node.rows.map((r) => (
              <p
                key={r}
                className="truncate font-mono text-[8px] uppercase tracking-[0.08em] text-eyebrow sm:text-[9px]"
              >
                {r}
              </p>
            ))}
          </div>
          {node.pips ? (
            <div className="mt-[8px] flex gap-[4px]">
              {node.pips.map((o, i) => (
                <span
                  key={i}
                  className="h-[4px] w-[4px] rounded-[1px]"
                  style={{ backgroundColor: "var(--color-warm)", opacity: o }}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}

/** The central node of the network: a dark disc with a live micro-label. */
function HubMarker({
  placement,
  duration,
}: {
  placement: Placement;
  duration: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute flex w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
      initial={false}
      animate={{ scale: placement.scale, opacity: placement.opacity }}
      transition={{ duration, ease: EASE_EXPO }}
    >
      <span className="whitespace-nowrap rounded-[2px] bg-page px-[4px] pb-[3px] font-mono text-[7px] uppercase tracking-[0.14em] text-eyebrow">
        Consolidating
      </span>
      <span className="relative h-[18px] w-[18px] rounded-full bg-surface-5 ring-1 ring-line-node">
        <span className="absolute -right-[3px] -top-[3px] h-[5px] w-[5px] rounded-[1px] bg-warm" />
      </span>
    </motion.div>
  );
}

/** The brand mark, shown once the sources are live and syncing. */
function MarkCard({
  placement,
  show,
  duration,
}: {
  placement: Placement;
  show: boolean;
  duration: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
      initial={false}
      animate={{
        scale: placement.scale,
        opacity: show ? placement.opacity : 0,
      }}
      transition={{ duration, ease: EASE_EXPO }}
    >
      <div className="glow-violet flex h-[78px] w-[78px] items-center justify-center rounded-[8px] border border-line-node bg-surface-2 sm:h-[86px] sm:w-[86px]">
        <Image
          src="/brand/mark.png"
          alt=""
          width={28}
          height={37}
          sizes="37px"
          className="h-[34px] w-auto"
        />
      </div>
    </motion.div>
  );
}

/**
 * The intake pulse: a small violet node that runs the connector stem from the
 * bus down to the sparkle's tip, holds for a beat, then fades and resets. It
 * sits inside the same fade block as `Sparkle`, so it leaves with the rest of
 * the intake payoff when the network phase takes over.
 */
function FlowNode({
  show,
  duration,
  reduceMotion,
}: {
  show: boolean;
  duration: number;
  reduceMotion: boolean | null;
}) {
  /* Reduced motion parks the node at rest rather than looping it. */
  const looping = show && reduceMotion !== true;

  return (
    <motion.div
      aria-hidden="true"
      className="absolute"
      style={{
        left: `${NODE_X}%`,
        translate: "-50% -50%",
        width: `${NODE_SIZE}%`,
        height: `${NODE_SIZE}%`,
      }}
      initial={false}
      animate={
        looping
          ? { top: NODE_TOP, opacity: NODE_ALPHA, scale: NODE_SCALE }
          : {
              top: `${NODE_REST_Y}%`,
              opacity: reduceMotion === true && show ? 1 : 0,
              scale: 1,
            }
      }
      transition={
        looping
          ? {
              duration: NODE_CYCLE,
              ease: EASE_EXPO,
              times: NODE_TIMES,
              repeat: Infinity,
            }
          : { duration: reduceMotion === true ? 0 : duration, ease: EASE_EXPO }
      }
    >
      {/* The halo is sized off the node box, so glow and core share one scale. */}
      <span className="absolute left-1/2 top-1/2 block h-[460%] w-[460%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-violet)_0%,transparent_68%)] opacity-80 blur-[4px]" />
      <span className="glow-violet absolute inset-0 block rounded-[1px] bg-violet" />
    </motion.div>
  );
}

function Sparkle({ show }: { show: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[48%] flex items-center gap-[10px]"
      /* -28px pins the 56px glow's centre on the bus stem, not on the
         glow + label pair. */
      style={{ translate: "-28px -50%" }}
    >
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-violet)_0%,transparent_66%)] opacity-60 blur-[10px]" />
        {/* The pulse only runs while the document is actually generating. */}
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "relative h-full w-full fill-violet",
            show && "animate-sparkle",
          )}
        >
          <path d="M12 0C12 7 17 12 24 12 17 12 12 17 12 24 12 17 7 12 0 12 7 12 12 7 12 0Z" />
        </svg>
      </div>
      <span className="t-eyebrow text-eyebrow">Generating brief</span>
    </div>
  );
}

function DocCard({ enter, duration }: { enter: number; duration: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[82%] w-[64%] -translate-x-1/2 -translate-y-1/2"
      /* Fades out over the bottom 55% of its height so it reads as continuing
         past the figure rather than being cropped by it. */
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
      }}
      initial={false}
      animate={{ opacity: enter, y: enter === 1 ? 0 : 34 }}
      transition={{ duration, ease: EASE_EXPO }}
    >
      <div className="node-card px-[18px] pt-[16px] pb-[44px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-[7px] text-eyebrow">
            <Home
              size={12}
              strokeWidth={1.5}
              aria-hidden="true"
              className="shrink-0"
            />
            <span className="truncate">
              Home&nbsp;&nbsp;/&nbsp;&nbsp;Transformation roadmap
            </span>
          </div>
          <ArrowUpRight size={13} className="shrink-0 text-muted" />
        </div>
        <h3 className="t-h3 mt-[20px] text-hi">Delivery roadmap</h3>
        <p className="mt-[14px] text-[12px] leading-[1.45] text-body">
          Every source reconciled into one scope, sequenced by dependency and by
          the effort each stage actually takes.
        </p>
      </div>
    </motion.div>
  );
}

function SyncLabel({
  label,
  show,
  duration,
}: {
  label: string;
  show: boolean;
  duration: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute left-1/2 top-[2%] flex -translate-x-1/2 items-center gap-[8px]"
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration, ease: EASE_EXPO }}
    >
      <span className="h-[6px] w-[6px] rounded-[1px] bg-brand-teal" />
      <span className="t-eyebrow text-muted">{label}</span>
    </motion.div>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S2FromNoise() {
  const ref = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  /* Desktop-first default so the server render and the first client render
     agree; narrow viewports flip it on mount, well before this section is in
     view. */
  const [isDesktop, setIsDesktop] = useState(true);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.72", "end 0.55"],
  });

  /* Equal fifths: [0,.2) → step 0, [.2,.4) → step 1 … [.8,1] → step 4. */
  const ramp = useTransform(scrollYProgress, [0, 1], [0, STEP_COUNT]);
  const stepIndex = useTransform(ramp, (v) =>
    Math.min(STEP_COUNT - 1, Math.max(0, Math.floor(v))),
  );

  useMotionValueEvent(stepIndex, "change", (v) => {
    setStep((prev) => (prev === v ? prev : v));
  });

  /* Seed the step on mount so a deep-linked or restored scroll position lands
     on the right state without waiting for a scroll event. */
  useEffect(() => {
    setStep(stepIndex.get());
  }, [stepIndex]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* Reduced motion, and any viewport too narrow to run the sticky narrative,
     both settle on the fully-rendered first step with no scroll coupling. */
  const settled = reduceMotion === true || !isDesktop;
  const activeStep = settled ? 0 : step;
  const layout = LAYOUTS[activeStep] ?? LAYOUTS[0];

  const networkMode = activeStep > 0;
  const paths = networkMode ? networkPaths(layout) : intakePaths(layout);
  const morph = reduceMotion === true ? 0 : DURATION.morph;

  return (
    <section id="process" className="section-pad relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blueprint-fade-radial"
      />
      <Container>
        <p className="sr-only">
          Scattered inputs — documentation, call recordings, survey responses,
          inboxes and support threads — are reconciled into one structured
          system, then measured and improved on a repeating cycle.
        </p>

        {/* Tall enough that the sticky figure has real scroll distance to
            cover all five steps; nothing here may set `overflow`, which would
            kill position: sticky. */}
        <div
          ref={ref}
          className="grid grid-cols-1 gap-y-14 lg:min-h-[180vh] lg:grid-cols-12 lg:gap-x-[54px] lg:gap-y-0"
        >
          {/* ---------------------------------------------------------- LEFT */}
          <div className="lg:col-span-4">
            <Heading2 className="max-w-[364px] leading-[1.05]">
              Many tools.
              <br />
              One system.
            </Heading2>

            <ol className="relative mt-[46px] max-w-[364px]">
              {STEPS.map((s, i) => {
                const active = i === activeStep;
                /* On narrow viewports every body is expanded — there is no
                   sticky figure to narrate, so the list reads as a plain spec. */
                const open = !isDesktop || active;

                return (
                  <li
                    key={s.title}
                    aria-current={active ? "step" : undefined}
                    className="relative pb-[26px] pl-[30px] last:pb-0"
                  >
                    {/* The rail runs from this dot to the next; the last step has
                        no segment, so the line terminates on its dot. */}
                    {i < STEP_COUNT - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[9px] top-[18px] w-px bg-[#0e0e0e]"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-1 top-[13px] rounded-full",
                        active ? "h-3 w-3 bg-hi" : "h-2.5 w-2.5 bg-surface-5",
                      )}
                    />

                    {/* Active state is carried by colour and weight, so it is
                        legible with animation disabled. */}
                    <p
                      className={cn(
                        "flex min-h-[46px] items-center text-[15px] leading-[1.3]",
                        active
                          ? "font-medium text-hi"
                          : "font-normal text-muted",
                      )}
                    >
                      {s.title}
                    </p>

                    <motion.div
                      initial={false}
                      animate={{
                        height: open ? "auto" : 0,
                        opacity: open ? 1 : 0,
                      }}
                      transition={{ duration: morph, ease: EASE_EXPO }}
                      className="overflow-hidden"
                    >
                      <p className="pt-[2px] text-[12px] leading-[1.35] text-body">
                        {s.body}
                      </p>
                    </motion.div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* --------------------------------------------------------- RIGHT */}
          <div className="lg:col-span-8">
            <div className="lg:sticky lg:top-[100px]">
              <div
                aria-hidden="true"
                className="relative ml-auto aspect-[628/560] w-full max-w-[628px]"
              >
                {/* Connector layer — the <g> is keyed per step so every edge
                    redraws when the arrangement changes. */}
                <svg
                  viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="absolute inset-0 z-0 h-full w-full text-line-node"
                  fill="none"
                >
                  <g key={networkMode ? `sync-${activeStep}` : "intake"}>
                    {paths.map((d, i) => (
                      <motion.path
                        key={i}
                        d={d}
                        pathLength={1}
                        stroke="currentColor"
                        strokeWidth={1}
                        initial={
                          reduceMotion === true
                            ? false
                            : { strokeDasharray: "1", strokeDashoffset: 1 }
                        }
                        animate={{ strokeDashoffset: 0 }}
                        transition={{
                          duration: 0.5,
                          ease: EASE_EXPO,
                          delay: i * 0.06,
                        }}
                      />
                    ))}
                  </g>
                </svg>

                {/* Node layer — one mounted element per source, re-slotting. */}
                {NODES.map((n) => (
                  <NodeCard
                    key={n.id}
                    node={n}
                    placement={layout[n.id]}
                    duration={morph}
                  />
                ))}

                <HubMarker placement={layout.hub} duration={morph} />
                <MarkCard
                  placement={layout.mark}
                  show={networkMode}
                  duration={morph}
                />

                {/* Intake payoff. All of it stays mounted so each half of the
                    swap has somewhere to fade from and fade to. */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: networkMode ? 0 : 1,
                    y: networkMode ? 14 : 0,
                  }}
                  transition={{ duration: morph, ease: EASE_EXPO }}
                  className="pointer-events-none"
                >
                  <FlowNode
                    show={!networkMode}
                    duration={morph}
                    reduceMotion={reduceMotion}
                  />
                  <Sparkle show={!networkMode} />
                </motion.div>

                <DocCard enter={networkMode ? 0 : 1} duration={morph} />

                <SyncLabel
                  label={PHASE_LABEL[activeStep - 1] ?? PHASE_LABEL[0]}
                  show={networkMode}
                  duration={morph}
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
