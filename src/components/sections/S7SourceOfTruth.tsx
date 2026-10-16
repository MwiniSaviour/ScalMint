"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  ButtonLink,
  Container,
  Eyebrow,
  Heading2,
} from "@/components/ui/primitives";
import { staggerContainer, staggerItem } from "@/lib/motion";

/* ============================================================================
   S7 — SYSTEM OF RECORD

   Two columns against a 12-column grid: 5 for the text, 7 for the orbital
   wireframe globe. The split is a 42/58 ratio, not the ~33/67 a two-column
   band usually uses — the text column is deliberately narrow so the headline
   has to break at the measured rhythm.

   Geometry measured from the reference at 1440x900:
· text column        486px (5 of 12 columns, 24px gutters)
      · globe column       690px, extended one gutter right so the sphere
                           crops on the viewport edge
      · eyebrow -> h2      24px
     · h2 -> body         30px
     · body -> buttons    32px

   The text block is NOT centre-aligned to the globe. Its optical centre sits
   below the sphere's, which is why the column carries padding rather than
   sitting on a shared centreline — see the note on `pt` below.

   No hover, scroll or press states are invented here. The reference is a
   static band; the only motion is the globe's, and it is decorative.
   ========================================================================== */

const EYEBROW = "System of record";

/* Authored as two block lines rather than left to `text-wrap: balance`. The
   measure is narrow enough that a reflow at 486px would put three words on the
   first line and one on the second, so the rag is pinned.

   Line widths at 64px Inter 500 / -0.03em, measured against the live font:
   "One record." 340px, "No re-typing." 383px, "Nothing re-keyed." 520px.
   The last one overran the measure and wrapped to a third line, so the copy
   was shortened rather than the column widened. */
const HEADLINE_LINES = ["One record.", "No re-typing."] as const;

const BODY =
  "One canonical record of the business — the source product, ops, sales and support measure.";

const SPHERE_DESCRIPTION =
  "Illustration: a wireframe globe encircled by one dashed orbit, standing for a single shared system of record that every part of the business reads from.";

/* ============================================================================
   SPHERE GEOMETRY

   The globe is an orthographic projection of a sphere whose axis is vertical in
   screen space. Both line families are therefore exact ellipses, which is why
   this is 28 <ellipse> elements rather than a traced path:

     · A parallel at polar angle `phi` sits on a plane at height radius*sin(phi)
       with circle radius radius*cos(phi). Projected, that is a circle of
       radius `radius*cos(phi)` whose centre is `radius*sin(phi)` below the
       sphere centre.

     · A meridian is a great circle through both poles. Projected, it is an
       ellipse centred on the sphere with semi-axes (radius*cos(lambda),
       radius) — so every meridian shares one vertical extent and one pair of
       poles, and narrows as it swings toward the silhouette. Sampling lambda
       over [0, 90) gives `count` distinct ellipses; the far half of the sphere
       retraces them exactly.

   The tilt is a single static rotation on the parent <g>. A longitude grid
   this uniform is rotationally symmetric, so rotating the projection is the
   same picture as a tilted sphere seen from another longitude — one attribute
   buys the whole oblique view for free.
   ========================================================================== */

const VIEW_W = 745;
const VIEW_H = 469;

/* The sphere is deliberately larger than the column it is drawn in, and is
   centred to the right of the column's own midpoint so that it is cropped by
   the section's right edge rather than sitting inside it. The reference shows
   roughly two-thirds of a globe; the right third runs past the viewport.

   The crop lands on the viewport edge only because the wrapper below extends a
   gutter's width past the container (see `mr-[-120px]` there). At viewports
   between 1180 and 1320 the gutter is narrower than that, so the crop simply
   falls earlier — still a bleed, never a scrollbar, because the section clips. */
const GLOBE_CX = 520;
const GLOBE_CY = 265;
const GLOBE_R = 294;
const GLOBE_TILT = -21;

/** Half the angular sweep the parallels cover. The poles themselves are left
    out because a parallel there degenerates to a single point. */
const POLAR_RANGE = 80;
/* Raised from the 240px-radius density: at 294 the same count would read as a
   sparser, emptier lattice than the reference's. */
const WIRE_COUNT = 18;

const D2R = Math.PI / 180;

type Sphere = {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
};

type Wire = {
  readonly key: string;
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly stroke: string;
};

/* Four existing tones spanning #0B0B0B -> #171717. --color-wire (#131313) is
   the peak the reference samples at most often; --color-surface-3 is reserved
   for the handful of curves facing the viewer most squarely. */
const WIRE_TONES = [
  "var(--color-wire-dim)",
  "var(--color-grid)",
  "var(--color-wire)",
  "var(--color-surface-3)",
] as const;

/** `weight` is how squarely a curve faces the viewer: 0 at the silhouette or a
    pole, 1 at the equator or the central meridian. The thresholds are
    deliberately loose about the brightest tier so the mid tone stays the
    plurality rather than an outlier. */
function toneFor(weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const index = w < 0.26 ? 0 : w < 0.5 ? 1 : w < 0.92 ? 2 : 3;
  return WIRE_TONES[index];
}

function parallels({ cx, cy, radius }: Sphere, count: number): readonly Wire[] {
  const step = (2 * POLAR_RANGE) / (count - 1);
  const out: Wire[] = [];

  for (let i = 0; i < count; i += 1) {
    const phi = (i - (count - 1) / 2) * step;
    const facing = Math.cos(phi * D2R);
    const r = radius * facing;

    out.push({
      key: `lat-${i}`,
      cx,
      cy: cy + radius * Math.sin(phi * D2R),
      rx: r,
      ry: r,
      stroke: toneFor(facing),
    });
  }

  return out;
}

function meridians({ cx, cy, radius }: Sphere, count: number): readonly Wire[] {
  const step = 90 / count;
  const out: Wire[] = [];

  for (let i = 0; i < count; i += 1) {
    const facing = Math.cos(i * step * D2R);

    out.push({
      key: `lon-${i}`,
      cx,
      cy,
      rx: radius * facing,
      ry: radius,
      stroke: toneFor(facing),
    });
  }

  return out;
}

/* Built once at module scope: deterministic, so the server and client render
   identical markup, and the geometry is never recomputed on render. */
const GLOBE: readonly Wire[] = [
  ...parallels({ cx: GLOBE_CX, cy: GLOBE_CY, radius: GLOBE_R }, WIRE_COUNT),
  ...meridians({ cx: GLOBE_CX, cy: GLOBE_CY, radius: GLOBE_R }, WIRE_COUNT),
];

/* The orbit. In the reference this is a wide, shallow ellipse that crosses the
   sphere's upper-left flank in front and runs off both edges of the frame — the
   left arc is what reads, sweeping in near the globe's top-left, down across
   the left side, and away toward the lower left. Centring it on the sphere (as
   opposed to offsetting it) is what puts the visible crossing on that flank
   rather than off to one side. Bounds are tuned so the ellipse's extremes reach
   past the viewBox edges, which is what crops it. */
const ORBIT_CX = 500;
const ORBIT_CY = 292;
const ORBIT_RX = 392;
const ORBIT_RY = 116;
const ORBIT_TILT = -20;

/* Dash pitch 5px on / 7px off, so one full period is 12 units. The animation
   walks `stroke-dashoffset` across exactly one period, which loops seamlessly.
   The period grew with the orbit so the dashes keep their reference density
   instead of becoming finer than the 1px wire. */
const DASH_PERIOD = 12;
const DASH_ON = 5;

/* ============================================================================
   ORBITAL GLOBE
   ========================================================================== */

function OrbitalGlobe({ still }: { still: boolean }) {
  return (
    /* Purely a restatement of the column beside it, so the artwork is hidden
       and the meaning is read from the text. `slice` on an exactly matching box
       is a pure scale, and on any narrower viewport it crops rather than
       distorts. */
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <g transform={`rotate(${GLOBE_TILT} ${GLOBE_CX} ${GLOBE_CY})`}>
        {GLOBE.map((wire) => (
          <ellipse
            key={wire.key}
            cx={wire.cx}
            cy={wire.cy}
            rx={wire.rx}
            ry={wire.ry}
            fill="none"
            stroke={wire.stroke}
            strokeWidth={1}
            /* The viewBox is scaled to the column, so without this the 1px
                 wire would thicken on wide viewports. */
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Painted after the globe so it reads as crossing in front. Dashes
            travel along the orbit instead of the orbit tumbling — the artwork
            already carries one rotation (see below) and a second rigid spin
            would read as a gimmick rather than an orbit. */}
      <ellipse
        cx={ORBIT_CX}
        cy={ORBIT_CY}
        rx={ORBIT_RX}
        ry={ORBIT_RY}
        fill="none"
        stroke="var(--color-wire)"
        strokeWidth={1}
        strokeDasharray={`${DASH_ON} ${DASH_PERIOD - DASH_ON}`}
        vectorEffect="non-scaling-stroke"
        transform={`rotate(${ORBIT_TILT} ${ORBIT_CX} ${ORBIT_CY})`}
      >
        {/* globals.css neutralises CSS animation under
              prefers-reduced-motion but cannot reach SMIL, so the element is
              simply not rendered. There is no JS loop to guard anywhere. */}
        {still ? null : (
          <animate
            attributeName="stroke-dashoffset"
            from={String(DASH_PERIOD)}
            to="0"
            dur="6s"
            repeatCount="indefinite"
          />
        )}
      </ellipse>
    </svg>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S7SourceOfTruth() {
  const reduce = useReducedMotion();

  return (
    <section
      id="system-of-record"
      className="section-pad relative overflow-hidden bg-page"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[28px] h-[240px] wire-rects"
      />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-y-[56px] min-[1180px]:grid-cols-12 min-[1180px]:gap-x-[24px]">
          {/* ------------------------------------------------------- TEXT */}
          {/* Padding, not a transform: the optical offset has to coexist with
              Framer's entrance `y` on the wrapper below, and two owners of one
              `transform` property is exactly the conflict to avoid here. */}
          <motion.div
            initial={reduce === true ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer(0.08)}
            className="min-[1180px]:col-span-5 min-[1180px]:pt-[56px]"
          >
            <motion.div variants={staggerItem}>
              <Eyebrow>{EYEBROW}</Eyebrow>
            </motion.div>

            <motion.div variants={staggerItem} className="mt-6">
              <Heading2>
                {HEADLINE_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </Heading2>
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="t-body-lg mt-[30px] max-w-[486px] text-body"
            >
              {BODY}
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mt-8 flex flex-wrap gap-2"
            >
              <ButtonLink href="/contact" variant="primary">
                Start a project
              </ButtonLink>
              <ButtonLink href="/#approach" variant="ghost">
                See how we work
              </ButtonLink>
            </motion.div>
          </motion.div>

          {/* ------------------------------------------------------ GLOBE */}
          <div className="min-[1180px]:col-span-7">
            <p className="sr-only">{SPHERE_DESCRIPTION}</p>

            {/* `animate-orb` is a CSS animation on `transform`. It is applied
                here, to the HTML wrapper, and to nothing inside the SVG — the
                SVG's only animation is SMIL on `stroke-dashoffset`, a different
                property on a different node. Two systems, zero contention.

                `mr-[-120px]` + the matching width push the artwork one gutter
                past the container so the sphere is cropped by the viewport edge
                instead of the column edge. The section's own `overflow-hidden`
                absorbs the overshoot, so this can never produce a scrollbar. */}
            <div className="animate-orb relative aspect-[745/469] w-full overflow-hidden min-[1180px]:mr-[-120px] min-[1180px]:w-[calc(100%+120px)]">
              <OrbitalGlobe still={reduce === true} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
