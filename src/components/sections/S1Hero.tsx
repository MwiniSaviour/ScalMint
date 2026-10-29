"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ButtonLink,
  Container,
} from "@/components/ui/primitives";
import { riseIn, useReveal } from "@/lib/motion";

/* ============================================================================
   S1 — HERO
   Single centred column over a perspective blueprint "room". Nothing in this
   section is permitted to introduce a hex value that globals.css already owns
   as a token, so every decorative colour is referenced through var().
   ========================================================================== */

const HEADLINE_LINES = ["We turn business needs", "into working software."] as const;

const SUBHEAD =
  "Digital transformation is every modern business’s job. We build the systems that make it measurable.";

const KEYNOTE_LABEL = "Read the 2026 ScalMint systems report";

/* ============================================================================
   DECORATIVE GEOMETRY — a one-point perspective room.
   The SVG is authored in a fixed 1440x900 box and drawn with
   preserveAspectRatio="slice", so it crops rather than distorts on any
   viewport; all measurements below are therefore stable pixel samples.
   ========================================================================== */

const VIEW_W = 1440;
const VIEW_H = 900;

/** Vanishing point, set slightly left of and above the frame centre. */
const VP_X = 660;
const VP_Y = 408;

const GRID = "var(--color-grid)";
const WIRE = "var(--color-wire)";
const WIRE_DIM = "var(--color-wire-dim)";
const LINE = "var(--color-line)";
const LINE_NODE = "var(--color-line-node)";
const SURFACE_3 = "var(--color-surface-3)";
const WARM = "var(--color-warm)";
const WARM_DEEP = "var(--color-warm-deep)";

/**
 * Horizontal grid lines, mirrored about the horizon so the vanishing point
 * reads as floor + ceiling. Pitch starts at 20px on the horizon and grows by
 * 1.12 per line, which lands it at ~77px by the frame edge — the two numbers
 * measured off the reference. Mirroring stops being visible where the box
 * clips it, so no per-side clamping is needed.
 */
const DEPTH_LINES: readonly number[] = (() => {
  const out: number[] = [];
  let offset = 20;
  let pitch = 20;
  while (offset < 560) {
    out.push(VP_Y + offset, VP_Y - offset);
    offset += pitch;
    pitch *= 1.12;
  }
  return out;
})();

/**
 * Rays from the vanishing point to the top and bottom frame edges. Spacing is
 * uniform in world space (64px at the edge), so cells are roughly square
 * exactly where the grid is widest — where the eye actually reads the depth.
 */
const RAY_X: readonly number[] = (() => {
  const out: number[] = [];
  for (let x = -704; x <= VIEW_W + 704; x += 64) out.push(x);
  return out;
})();

/** Filled squares scattered at grid intersections, 3-7px. The right-hand
 *  entries inside y<400 were removed when the node lattice took that corner;
 *  the lattice owns that space now and doubling it up muddied both. */
const SQUARES: ReadonlyArray<readonly [number, number, number]> = [
  [118, 214, 4],
  [176, 158, 5],
  [232, 268, 3],
  [96, 372, 6],
  [208, 452, 4],
  [268, 196, 5],
  [352, 330, 3],
  [150, 520, 5],
  [322, 610, 4],
  [96, 640, 3],
  [404, 214, 6],
  [1244, 452, 3],
  [118, 96, 3],
  [640, 150, 4],
  [128, 780, 5],
  [1310, 660, 4],
  [560, 806, 3],
];

/** Plus-crosses at intersections. Third value is the arm length. */
const CROSSES: ReadonlyArray<readonly [number, number, number]> = [
  [190, 300, 5],
  [268, 420, 6],
  [128, 470, 5],
  [366, 208, 5],
  [420, 486, 6],
  [92, 300, 5],
  [660, 250, 5],
  [1040, 690, 5],
  [1230, 600, 6],
];

/** Orthogonal hairlines tying the constellation into loose rectangles. */
const WIRES: readonly string[] = [
  "M96 372 H268 V452 H150",
  "M118 96 H268 V196",
  "M1040 690 H1230 V600",
];

/** Rising staircase trace across the right half; alternating diagonal and
 *  vertical runs are what make it read as a chart rather than a scribble. */
const TRACE: ReadonlyArray<readonly [number, number]> = [
  [836, 726],
  [898, 664],
  [964, 632],
  [964, 556],
  [1030, 522],
  [1092, 446],
  [1158, 414],
  [1158, 338],
  [1222, 304],
  [1288, 228],
  [1346, 196],
];

/** Dimmer predecessor of the main trace, low and near the centre. */
const TRACE_BRANCH: ReadonlyArray<readonly [number, number]> = [
  [640, 812],
  [706, 764],
  [742, 712],
  [800, 684],
];

/* ============================================================================
   NODE LATTICE — the discrete wireframe cluster on the right of the hero.

   The reference does not read its right-hand wireframe as an all-over
   texture: it is a separate object, a sparse lattice of square nodes joined by
   1px connectors, confined to roughly x 1060-1440 / y 95-360 so the centre of
   the hero — where the H1, subhead and CTAs sit — stays dark. The vanishing
   point room above is what fills the field behind it; the lattice is authored
   on its own 68px grid so it stays legible instead of dissolving into the rays.

   The grid runs one column past the viewport edge, which is what makes the
   cluster read as continuing off-frame rather than ending on a tidy border.
   ========================================================================== */

type LatticeTone = "dim" | "lit";

const LATTICE_COL_X: readonly number[] = [1062, 1130, 1198, 1266, 1334, 1402, 1470];
const LATTICE_ROW_Y: readonly number[] = [98, 166, 234, 302, 370];

/** Cell pitch, shared by both axes. */
const LATTICE_CELL = 68;

/** Node entries: [column, row, tone, edge length]. */
const LATTICE_NODES: ReadonlyArray<readonly [number, number, LatticeTone, number]> = [
  [1, 0, "dim", 5],
  [2, 0, "lit", 8],
  [3, 0, "lit", 7],
  [4, 0, "dim", 5],
  [0, 1, "lit", 7],
  [2, 1, "lit", 8],
  [3, 1, "dim", 6],
  [4, 1, "dim", 5],
  [1, 2, "lit", 7],
  [2, 2, "dim", 5],
  [3, 2, "lit", 6],
  [5, 2, "lit", 8],
  [0, 2, "dim", 5],
  [2, 3, "lit", 7],
  [3, 3, "dim", 6],
  [4, 3, "lit", 8],
  [1, 4, "lit", 7],
  [2, 4, "dim", 5],
  [4, 4, "dim", 6],
  [5, 4, "dim", 5],
];

/**
 * Orthogonal connectors as pairs of LATTICE_NODES indices. Deliberately not a
 * complete grid — the gaps are what make it read as a lattice rather than a
 * wireframe room, and they leave several nodes as free-floating terminals.
 */
const LATTICE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [2, 3],
  [1, 5],
  [2, 6],
  [3, 7],
  [5, 6],
  [6, 7],
  [4, 8],
  [4, 12],
  [5, 9],
  [6, 10],
  [7, 15],
  [8, 9],
  [9, 10],
  [10, 11],
  [8, 16],
  [9, 13],
  [10, 14],
  [13, 14],
  [14, 15],
  [13, 17],
  [14, 18],
  [16, 17],
  [17, 18],
  [18, 19],
  [11, 19],
];

/**
 * Larger outlined squares. The first three are whole cells with their corners
 * landing on nodes, so they read as the bigger structures the reference grows
 * out of its own lattice; the last is a detached card that hangs off the right
 * edge with no corner on the grid at all.
 */
const LATTICE_BLOCKS: ReadonlyArray<readonly [number, number, number]> = [
  [LATTICE_COL_X[1], LATTICE_ROW_Y[1], LATTICE_CELL],
  [LATTICE_COL_X[3], LATTICE_ROW_Y[2], LATTICE_CELL],
  [LATTICE_COL_X[2], LATTICE_ROW_Y[3], LATTICE_CELL],
  [LATTICE_COL_X[5] + 6, LATTICE_ROW_Y[2] - 8, 44],
];

/** Warm outlined markers, all parked on cell centres. */
const LATTICE_WARM_MARKS: ReadonlyArray<readonly [number, number]> = [
  [1368, 132],
  [1164, 200],
  [1164, 268],
  [1232, 268],
  [1232, 336],
  [1402, 336],
];

/**
 * The warm signal vein threading the lattice. Alternating diagonal and
 * orthogonal runs are what separate it from the cool connectors behind it;
 * "lead" segments are the two lit stretches, everything else is the dimmer
 * deep tone.
 */
const LATTICE_WARM_RUNS: ReadonlyArray<
  readonly [number, number, number, number, "lead" | "trail"]
> = [
  [1368, 132, 1198, 166, "lead"],
  [1198, 166, 1164, 200, "trail"],
  [1164, 200, 1164, 268, "trail"],
  [1164, 268, 1232, 268, "trail"],
  [1232, 268, 1232, 336, "lead"],
  [1232, 336, 1198, 370, "trail"],
  [1334, 302, 1402, 336, "lead"],
  [1402, 336, 1470, 336, "trail"],
];

/** Runs that carry the lattice off the right viewport edge. */
const LATTICE_GHOSTS: readonly string[] = [
  "M1334 98 H1470",
  "M1402 234 H1470",
  "M1470 166 V370",
];

/**
 * The lattice passes behind the headline, whose 980px measure reaches x 1210 at
 * 1440 wide. Fading the leftmost columns keeps it from competing with the H1
 * instead of reading as a second focal point.
 */
function latticeFade(x: number): number {
  const t = (x - LATTICE_COL_X[0]) / (LATTICE_CELL * 1.5);
  return Math.min(1, Math.max(0.3, 0.3 + t * 0.7));
}

/* ============================================================================
   CLIENT ROSTER — invented wordmarks, one inline SVG each so widths stay
   optically varied the way a real logo lockup is. Weights, sizes and tracking
   are per-mark; nothing here resolves to a real company.

   Sizing budget: at xl the nine boxes sit in a 1020px measure alongside eight
   24px column gaps, so the widths below must sum to 776 or less — anything
   wider and the row wraps. Spare width is handed back as equal gaps by
   justify-between, not as larger marks.
   ========================================================================== */

type MarkKind = "none" | "square" | "chevron" | "ring" | "dots";

type ClientMark = {
  name: string;
  label: string;
  width: number;
  size: number;
  weight: number;
  /** Tracking expressed in em; converted to user units at render. */
  tracking: number;
  mark: MarkKind;
  /** Horizontal room reserved for the geometric mark, in glyph-grid units. */
  markWidth: number;
};

/** Marks sum to 769, inside the 776 ceiling above. */
const CLIENTS: readonly ClientMark[] = [
  { name: "Halvard", label: "HALVARD", width: 90, size: 15, weight: 400, tracking: 0.16, mark: "none", markWidth: 0 },
  { name: "Brightline", label: "Brightline", width: 94, size: 17, weight: 500, tracking: -0.01, mark: "square", markWidth: 9 },
  { name: "Cadenza", label: "Cadenza", width: 78, size: 18, weight: 400, tracking: 0.03, mark: "none", markWidth: 0 },
  { name: "Kestrel Freight", label: "KESTREL", width: 88, size: 15, weight: 700, tracking: 0.03, mark: "chevron", markWidth: 10 },
  { name: "Northpoint", label: "Northpoint", width: 98, size: 17, weight: 500, tracking: -0.015, mark: "ring", markWidth: 9 },
  { name: "Lumenar", label: "Lumenar", width: 76, size: 15, weight: 300, tracking: 0.12, mark: "none", markWidth: 0 },
  { name: "Vesper Bay", label: "Vesper Bay", width: 86, size: 16, weight: 500, tracking: 0, mark: "none", markWidth: 0 },
  { name: "Trellis", label: "Trellis", width: 79, size: 17, weight: 600, tracking: 0.02, mark: "dots", markWidth: 18 },
  { name: "Ostara Group", label: "OSTARA", width: 80, size: 17, weight: 700, tracking: 0.1, mark: "none", markWidth: 0 },
];

/**
 * Every <text> baseline sits at y=BASELINE_Y and every viewBox is 28 tall, so
 * the marks are baseline-aligned across the row whatever their type size. The
 * geometric glyphs are authored against that same grid at BASELINE_REF_SIZE and
 * scaled about the baseline, which keeps each lockup's internal proportions
 * fixed while the roster as a whole shrinks.
 */
const BASELINE_Y = 21;
const BASELINE_REF_SIZE = 22;

function MarkGlyph({ kind, scale }: { kind: MarkKind; scale: number }) {
  const glyph = (() => {
    switch (kind) {
      case "square":
        return <rect x={0} y={12} width={9} height={9} fill="currentColor" />;
      case "chevron":
        return (
          <path
            d="M0 21 L5 11 L10 21"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="square"
          />
        );
      case "ring":
        return (
          <circle
            cx={4.5}
            cy={16.5}
            r={4.5}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
        );
      case "dots":
        return (
          <g fill="currentColor">
            {[0, 6, 12].map((row) =>
              [0, 6, 12].map((col) => (
                <rect key={`${row}-${col}`} x={col} y={8 + row} width={3.4} height={3.4} />
              )),
            )}
          </g>
        );
      default:
        return null;
    }
  })();

  if (!glyph) return null;

  return (
    <g transform={`translate(0 ${BASELINE_Y}) scale(${scale}) translate(0 ${-BASELINE_Y})`}>
      {glyph}
    </g>
  );
}

/* ============================================================================
   BACKDROP
   ========================================================================== */

function BlueprintRoom() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Flat 83px grid from the design system, radially masked so it fills the
          gaps between rays without ever terminating on a hard edge. Dropped to
          25% because the node lattice is now the brightest decorative element
          on the right and the grid was competing with it. */}
      <div className="blueprint absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_72%_58%_at_50%_44%,#000,transparent_80%)]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        shapeRendering="geometricPrecision"
      >
        <g stroke={GRID} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {RAY_X.map((x) => (
            <line key={`b${x}`} x1={VP_X} y1={VP_Y} x2={x} y2={VIEW_H} />
          ))}
          {RAY_X.map((x) => (
            <line key={`t${x}`} x1={VP_X} y1={VP_Y} x2={x} y2={0} />
          ))}
          {DEPTH_LINES.map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={VIEW_W} y2={y} />
          ))}
        </g>

        <g stroke={WIRE} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {WIRES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        <g fill={SURFACE_3}>
          {SQUARES.map(([x, y, s]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={s} height={s} />
          ))}
        </g>

        <g stroke={LINE} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {CROSSES.map(([x, y, arm]) => (
            <path key={`${x}-${y}`} d={`M${x - arm} ${y} H${x + arm} M${x} ${y - arm} V${y + arm}`} />
          ))}
        </g>

        {/* Warm trace. Opacity ramps toward the leading segment so the chart
            reads as still-developing rather than uniformly lit. */}
        <g strokeWidth={1.2} vectorEffect="non-scaling-stroke">
          {TRACE.slice(0, -1).map(([x1, y1], i) => {
            const next = TRACE[i + 1];
            const t = i / (TRACE.length - 2);
            return (
              <line
                key={`t${i}`}
                x1={x1}
                y1={y1}
                x2={next[0]}
                y2={next[1]}
                stroke={i > 6 ? WARM : WARM_DEEP}
                opacity={0.3 + t * 0.5}
              />
            );
          })}
          {TRACE_BRANCH.slice(0, -1).map(([x1, y1], i) => {
            const next = TRACE_BRANCH[i + 1];
            return (
              <line
                key={`b${i}`}
                x1={x1}
                y1={y1}
                x2={next[0]}
                y2={next[1]}
                stroke={WARM_DEEP}
                opacity={0.22}
              />
            );
          })}
        </g>

        <g fill={WARM}>
          {TRACE.map(([x, y], i) => (
            <rect
              key={`n${i}`}
              x={x - 2.5}
              y={y - 2.5}
              width={5}
              height={5}
              opacity={0.4 + (i / TRACE.length) * 0.5}
            />
          ))}
        </g>

        {/* ---------------------------------------------------------------
            NODE LATTICE — drawn last so it sits above the vanishing-point
            room. Ordered back-to-front: off-frame ghosts, connectors, the
            larger outlined structures, then the nodes that anchor them.
            --------------------------------------------------------------- */}
        <g stroke={WIRE_DIM} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {LATTICE_GHOSTS.map((d) => (
            <path key={`g${d}`} d={d} />
          ))}
        </g>

        <g stroke={LINE} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {LATTICE_EDGES.map(([a, b]) => {
            const from = LATTICE_NODES[a];
            const to = LATTICE_NODES[b];
            const x1 = LATTICE_COL_X[from[0]];
            const y1 = LATTICE_ROW_Y[from[1]];
            const x2 = LATTICE_COL_X[to[0]];
            const y2 = LATTICE_ROW_Y[to[1]];
            return (
              <line
                key={`e${a}-${b}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                opacity={latticeFade(Math.min(x1, x2))}
              />
            );
          })}
        </g>

        <g fill="none" stroke={LINE_NODE} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {LATTICE_BLOCKS.map(([x, y, size]) => (
            <rect
              key={`b${x}-${y}`}
              x={x}
              y={y}
              width={size}
              height={size}
              opacity={latticeFade(x)}
            />
          ))}
          <path d="M1221 132 H1243 M1232 121 V143" opacity={0.8} />
        </g>

        <g>
          {LATTICE_NODES.map(([col, row, tone, size]) => {
            const x = LATTICE_COL_X[col];
            const y = LATTICE_ROW_Y[row];
            return (
              <rect
                key={`n${col}-${row}`}
                x={x - size / 2}
                y={y - size / 2}
                width={size}
                height={size}
                fill={tone === "lit" ? LINE_NODE : SURFACE_3}
                opacity={latticeFade(x)}
              />
            );
          })}
        </g>

        <g strokeWidth={1} vectorEffect="non-scaling-stroke">
          {LATTICE_WARM_RUNS.map(([x1, y1, x2, y2, kind], i) => (
            <line
              key={`w${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={kind === "lead" ? WARM : WARM_DEEP}
              opacity={kind === "lead" ? 0.62 : 0.4}
            />
          ))}
        </g>

        <g stroke={WARM_DEEP} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.55}>
          {LATTICE_WARM_MARKS.map(([x, y]) => (
            <rect
              key={`m${x}-${y}`}
              x={x - 3.5}
              y={y - 3.5}
              width={7}
              height={7}
              fill={SURFACE_3}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S1Hero() {
  const { ref, inView } = useReveal<HTMLUListElement>("-40px");

  return (
    <section
      className="relative isolate flex min-h-[calc(100vh-72px)] flex-col overflow-hidden bg-page"
      aria-labelledby="s1-heading"
    >
      <BlueprintRoom />

      <div className="relative z-10 flex min-h-[calc(100vh-72px)] flex-1 flex-col">
        {/* Nav is a 72px sticky overlay, so the first 180px is its airspace. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 pt-[clamp(120px,19vh,190px)] pb-14 text-center md:gap-8">
          <motion.div {...riseIn(0.04)}>
            <a
              href="#report"
              className="t-eyebrow inline-flex h-[30px] items-center gap-2.5 rounded-pill border border-line bg-surface-3 pl-3.5 pr-2.5 text-body transition-colors duration-150 hover:border-line hover:text-hi"
            >
              <span className="size-[6px] shrink-0 rounded-full bg-blue" />
              {KEYNOTE_LABEL}
              <ArrowUpRight size={11} className="text-muted" />
            </a>
          </motion.div>

          <motion.h1
            id="s1-heading"
            {...riseIn(0.12)}
            className="t-hero max-w-[980px] text-hi"
          >
            {HEADLINE_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </motion.h1>

          <motion.p {...riseIn(0.22)} className="t-body-lg max-w-[600px] text-body">
            {SUBHEAD}
          </motion.p>

          <motion.div {...riseIn(0.32)} className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/contact">
              Book a discovery call
              <ArrowUpRight size={13} />
            </ButtonLink>
            <ButtonLink href="#services" variant="ghost">
              See what we build
            </ButtonLink>
          </motion.div>
        </div>

        <Container className="pb-14 md:pb-16">
          <p id="s1-roster-label" className="sr-only">
            Selected clients
          </p>
          {/* Below xl the row is free to wrap, so it stays centred and keeps its
              comfortable gap. From xl the nine marks are pinned to a 1020px
              measure (the reference's ~113px pitch) and spread edge to edge by
              justify-between; flex-nowrap makes the single-row guarantee
              structural rather than an arithmetic accident of the mark widths. */}
          <motion.ul
            ref={ref}
            aria-labelledby="s1-roster-label"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.42 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 text-muted xl:max-w-[1020px] xl:flex-nowrap xl:justify-between xl:gap-x-6 xl:mx-auto"
          >
            {CLIENTS.map((client) => {
              const hasMark = client.mark !== "none";
              const markScale = client.size / BASELINE_REF_SIZE;
              return (
                <li key={client.name} className="flex items-center">
                  <svg
                    width={client.width}
                    height={28}
                    viewBox={`0 0 ${client.width} 28`}
                    role="img"
                    className="h-[22px] w-auto overflow-visible sm:h-[28px]"
                  >
                    <title>{client.name}</title>
                    {hasMark && <MarkGlyph kind={client.mark} scale={markScale} />}
                    <text
                      x={
                        hasMark
                          ? (client.markWidth + 9) * markScale
                          : client.width / 2
                      }
                      y={BASELINE_Y}
                      textAnchor={hasMark ? "start" : "middle"}
                      fill="currentColor"
                      fontSize={client.size}
                      fontWeight={client.weight}
                      letterSpacing={client.tracking * client.size}
                    >
                      {client.label}
                    </text>
                  </svg>
                </li>
              );
            })}
          </motion.ul>
        </Container>
      </div>
    </section>
  );
}