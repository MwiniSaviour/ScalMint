"use client";

import { Fragment, useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  BrainCircuit,
  Database,
  Globe,
  Laptop,
  Smartphone,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/ui/primitives";
import { EASE_EXPO, useReveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ============================================================================
   S3 — EDITORIAL STATEMENT

   Three paragraphs, nine lines, indented right of centre inside a 12-column
   grid. Every line is an explicit block so the rag is authored, not inherited
   from whatever the font metrics happen to produce.

   Geometry measured from the reference at 1440x900:
     · statement column   785px wide, 44px type, 1.02 leading (45px pitch)
     · paragraph gap      47px (one blank line at the measured pitch)
     · statement -> tiles 96px
     · tiles              87x87, radius 4, #1D1D1D, 47px gaps, one row
     · wireframe cells    75 x 38
   ========================================================================== */

/** The mask's resting dim. 0.494 is the alpha at which a pure-white glyph
    composites onto --color-page as exactly --color-muted (#838383). */
const DIM_ALPHA = 0.494;

/* Nine authored lines, three per paragraph. Widths were measured against real
   Inter metrics at 44px / -0.02em; the widest line is 660px inside a 785px
   column, so nothing can re-wrap. */
const STATEMENT: readonly (readonly string[])[] = [
  [
    "Digital transformation is not a",
    "project you schedule and shelve.",
    "It is how the business operates.",
  ],
  [
    "We build the system, then hand",
    "over the keys: shipped, tested,",
    "documented, and yours to run.",
  ],
  [
    "And we measure it against the",
    "number we agreed on before we",
    "wrote a single line of code.",
  ],
];

type Capability = { readonly label: string; readonly Icon: LucideIcon };

/* One per service ScalMint actually sells. Labels stay <= 7 characters so the
   mono eyebrow clears the 87px tile at its measured 12px / 0.12em. */
const CAPABILITIES: readonly Capability[] = [
  { label: "WEB", Icon: Globe },
  { label: "MOBILE", Icon: Smartphone },
  { label: "DESKTOP", Icon: Laptop },
  { label: "AGENTS", Icon: Workflow },
  { label: "DATA", Icon: Database },
  { label: "AI", Icon: BrainCircuit },
];

/** Wireframe rectangles at whole multiples of the 75 x 38 cell, clustered
    top-left so the dissolve has structure to fall away from. */
const WIRE_RECTS: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 3, 3],
  [3, 0, 2, 2],
  [5, 1, 4, 3],
  [9, 0, 3, 2],
  [1, 3, 2, 4],
  [3, 2, 4, 2],
  [7, 4, 4, 3],
  [0, 6, 4, 2],
  [4, 5, 3, 4],
  [1, 8, 3, 2],
  [4, 9, 5, 2],
  [8, 8, 4, 3],
];

const CELL_W = 75;
const CELL_H = 38;

/** Fine cell grid plus the larger rectangles, dissolved toward bottom-right so
    the texture stays felt rather than seen. Two levels above the page base. */
function Wireframe() {
  const dissolve =
    "radial-gradient(ellipse 60% 84% at 14% 24%, #000 0%, rgba(0,0,0,0.55) 44%, transparent 76%)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ WebkitMaskImage: dissolve, maskImage: dissolve }}
    >
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--color-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-grid)_1px,transparent_1px)] [background-size:75px_38px]" />
      {WIRE_RECTS.map(([cx, cy, cols, rows]) => (
        <span
          key={`${cx}-${cy}`}
          className="absolute border border-wire"
          style={{
            left: cx * CELL_W,
            top: cy * CELL_H,
            width: cols * CELL_W,
            height: rows * CELL_H,
          }}
        />
      ))}
    </div>
  );
}

export default function S3Statement() {
  const { ref, inView } = useReveal<HTMLDivElement>("-120px");
  const reduce = useReducedMotion();

  /* The dim is a mask, not per-line opacity, so the fade crosses the line
     boundaries instead of stepping. The ramp holds white through paragraph
     three's first line and only then falls to --color-muted at the baseline. */
  const dim = useMotionValue(reduce === true ? 1 : DIM_ALPHA);
  const mask = useTransform(
    dim,
    (a) =>
      `linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 82%, rgba(255,255,255,${a.toFixed(4)}) 100%)`,
  );

  useEffect(() => {
    if (reduce === true) {
      dim.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(dim, 1, { duration: 0.6, ease: EASE_EXPO });
    return () => controls.stop();
  }, [dim, inView, reduce]);

  return (
    <section
      id="approach"
      className="section-pad relative overflow-hidden bg-page"
    >
      <Wireframe />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 min-[1280px]:grid-cols-12 min-[1280px]:gap-x-[24px]">
          <div className="min-[1280px]:col-start-5 min-[1280px]:col-span-7">
            {/* --------------------------------------------------------- TEXT */}
            <motion.div
              ref={ref}
              style={{ WebkitMaskImage: mask, maskImage: mask }}
              className="t-editorial text-hi max-[1280px]:text-[clamp(26px,3.4375vw,38px)] max-[1280px]:leading-[1.08] min-[1280px]:w-[785px]"
            >
              {STATEMENT.map((paragraph, p) => (
                <p
                  key={p}
                  className={cn(p < STATEMENT.length - 1 && "mb-[47px]")}
                >
                  {paragraph.map((line, l) => (
                    /* The trailing space is what rejoins the lines once the
                       spans stop being blocks on narrow viewports. */
                    <Fragment key={l}>
                      <span className="min-[1280px]:block">
                        {line}
                        {l < paragraph.length - 1 ? " " : null}
                      </span>
                    </Fragment>
                  ))}
                </p>
              ))}
            </motion.div>

            {/* -------------------------------------------------------- TILES */}
            <ul
              aria-label="Capabilities"
              className="mt-[56px] flex flex-wrap gap-[16px] min-[1280px]:mt-[96px] min-[1280px]:w-[785px] min-[1280px]:gap-[47px]"
            >
              {CAPABILITIES.map(({ label, Icon }, i) => (
                <motion.li
                  key={label}
                  initial={reduce === true ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.55,
                    ease: EASE_EXPO,
                    delay: reduce === true ? 0 : i * 0.06,
                  }}
                  className="flex h-[87px] w-[87px] flex-col items-center justify-center gap-[13px] rounded-tile bg-[#1D1D1D]"
                >
                  <Icon
                    size={40}
                    strokeWidth={1}
                    aria-hidden="true"
                    className="shrink-0 text-hi"
                  />
                  <span className="t-eyebrow text-muted">{label}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------------------------------------------------- BOTTOM RULE */}
        <div
          aria-hidden="true"
          className="mt-[48px] h-px w-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent, var(--color-line) 18%, var(--color-line) 82%, transparent)",
          }}
        />
      </Container>
    </section>
  );
}
