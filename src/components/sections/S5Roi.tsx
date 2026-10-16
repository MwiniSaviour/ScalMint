"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  ArrowUpRight,
  Container,
  Eyebrow,
  Pager,
  TextLink,
} from "@/components/ui/primitives";
import { DURATION, EASE_EXPO, EASE_SWAP } from "@/lib/motion";

/* ============================================================================
   S5 — BUSINESS CASE / ROI CAROUSEL

   The reference pairs a fixed stat card on the left with a live chart on the
   right. Its a/b pair shows what actually moves between the two states: the
   card's *contents* swap while its box does not, the chart polyline changes
   *shape* (the second reference frame is literally labelled "on-animation
   shape transition"), the leader line re-aims, and the markers re-bloom. The
   caption block under the chart is byte-identical in both frames — it is page
   copy, not carousel content, so it must not animate here.

   MORPH STRATEGY. `points` is animated directly rather than cross-fading two
   paths. Framer Motion classifies a multi-number string as a "complex" value
   and interpolates it token by token, so every vertex translates in lockstep
   and the line reads as one object changing shape; a cross-fade would show two
   lines at once and lose that read. The guarantee is a constant vertex count
   across all four slides plus a single formatter, so the two point strings are
   always structurally identical — otherwise Motion degrades to a swap.

   Markers are bound to fixed vertex indices and their per-slide coordinates are
   authored to equal those vertices exactly. Because the polyline interpolates
   linearly and the markers travel on the same easing, the two coincide at every
   point in the transition, not just its endpoints.
   ========================================================================== */

type Point = readonly [x: number, y: number];

/* --- Chart geometry (viewBox units = CSS px at the measured 1440 viewport) - */

const CHART_W = 877;
const CHART_H = 500;

/** The leader leaves the card's right edge, runs horizontally, then cuts a 45
 *  degree diagonal down to the first marker. Every slide authors vertex 0 to
 *  satisfy `x - LEADER_CORNER_X === y - CHART_MID_Y`, so the diagonal stays
 *  exactly 45 degrees on every slide with no runtime correction. */
const LEADER_X = 8;
const LEADER_RUN = 43;
const LEADER_CORNER_X = LEADER_X + LEADER_RUN;
const CHART_MID_Y = CHART_H / 2;

/** 32x32 warm marker with the +/-28px radial falloff `glow-warm` provides. */
const MARKER_PX = 32;

/** Secondary 10x10 white nodes: one on the leader at the card edge, one pinned
 *  to a blueprint grid intersection. */
const NODE_PX = 10;
const CHART_NODE: Point = [664, 249]; // = 8 x 83, 3 x 83 — sits on the grid

/** The chart line sits just above `--color-line` (#262626, the card border) and
 *  at the reference's ~1.5px weight. No token covers this value. */
const LINE_STROKE = "#333333";
const LINE_WIDTH = 1.5;

/* --- Slides ----------------------------------------------------------------
   The figures are typical target outcomes an engagement is designed around, not
   audited results for any named business. Every body opens with the same
   "What we design for:" frame so the intent is never in doubt.
   ------------------------------------------------------------------------- */

type Slide = {
  readonly id: string;
  readonly eyebrow: string;
  readonly stat: string;
  readonly subline: string;
  readonly body: string;
  /** Seven vertices, 45/90 degree segments only. Constant length across slides
   *  — this is what keeps the points morph interpolable. */
  readonly vertices: readonly Point[];
  /** Some states hang a notch off the card's bottom edge, aiming at a marker
   *  the leader line has moved away from. */
  readonly notch: boolean;
};

const SLIDES: readonly Slide[] = [
  {
    id: "roi",
    eyebrow: "Return on investment",
    stat: "2.3x",
    subline: "Value lands sooner",
    body: "What we design for: a business case agreed before build, so the first release already moves a number you already report on.",
    vertices: [
      [90, 289],
      [290, 289],
      [410, 169],
      [610, 169],
      [720, 59],
      [780, 59],
      [830, 59],
    ],
    notch: true,
  },
  {
    id: "velocity",
    eyebrow: "Release velocity",
    stat: "3.1x",
    subline: "Ships per quarter",
    body: "What we design for: work cut into shippable slices behind a real architecture, so capacity converts into releases instead of a roadmap.",
    vertices: [
      [110, 309],
      [290, 309],
      [430, 169],
      [580, 169],
      [700, 49],
      [790, 49],
      [850, 49],
    ],
    notch: false,
  },
  {
    id: "cost",
    eyebrow: "Operating cost",
    stat: "28%",
    subline: "Less manual rework",
    body: "What we design for: intake and reconciliation automated end to end, so the same team absorbs more volume without more handwork.",
    vertices: [
      [150, 349],
      [330, 349],
      [470, 209],
      [630, 209],
      [740, 99],
      [810, 99],
      [870, 99],
    ],
    notch: true,
  },
  {
    id: "response",
    eyebrow: "Response time",
    stat: "-64%",
    subline: "First reply to a customer",
    body: "What we design for: WhatsApp and email answered in seconds and routed to a person, so no enquiry sits unread until the next morning.",
    vertices: [
      [110, 309],
      [230, 309],
      [360, 179],
      [550, 179],
      [680, 49],
      [810, 49],
      [870, 49],
    ],
    notch: false,
  },
];

const SLIDE_COUNT = SLIDES.length;

/** Which polyline vertices carry a glowing marker. Fixed across slides, so the
 *  four slots keep their identity and simply travel along the morphing line. */
const MARKER_VERTICES = [0, 2, 3, 4] as const;

/* --- Formatters ------------------------------------------------------------
   One formatter for every points string. Motion builds its separator template
   from the source value, so the format must be byte-identical everywhere or
   interpolation degrades to a plain swap.
   ------------------------------------------------------------------------- */

const formatPoints = (vertices: readonly Point[]): string =>
  vertices.map(([x, y]) => `${x},${y}`).join(" ");

const formatPercent = (value: number, total: number): string =>
  `${((value / total) * 100).toFixed(4)}%`;

/** A marker sits exactly on its vertex, which is what lets the travelling
 *  marker ride the interpolating polyline exactly rather than approximately. */
const markerAt = (slide: Slide, vertexIndex: number): Point =>
  slide.vertices[vertexIndex];

const leaderFor = (slide: Slide): string =>
  formatPoints([
    [LEADER_X, CHART_MID_Y],
    [LEADER_CORNER_X, CHART_MID_Y],
    slide.vertices[0],
  ]);

/* --- Copy ------------------------------------------------------------------ */

const SECTION_COPY = {
  eyebrow: "The business case",
  heading: "Outcomes we design for, measured from your baseline.",
  caption:
    "Build the case before the backlog. We define the measurable outcome with you, then ship against it.",
  link: "Download the digital transformation business case template",
} as const;

/* ============================================================================
   MARKER
   ========================================================================== */

function ChartMarker({
  x,
  y,
  bloomKey,
}: {
  x: number;
  y: number;
  bloomKey: string;
}) {
  return (
    /* Centred with margins, never a transform: the core's `animate-marker`
       keyframe owns `transform`, and nothing else competes for it. */
    <span
      aria-hidden="true"
      className="absolute block"
      style={{
        left: formatPercent(x, CHART_W),
        top: formatPercent(y, CHART_H),
        width: MARKER_PX,
        height: MARKER_PX,
        marginLeft: -MARKER_PX / 2,
        marginTop: -MARKER_PX / 2,
      }}
    >
      {/* 32x32 hard-edged square. `animate-marker` supplies the
          scale 0 -> 1.15 -> 1 spring overshoot in 500ms, re-keyed per slide so
          the bloom replays on every change. `glow-warm` is the sole glow and
          its 28px falloff is the whole radius: a second, larger bloom here
          rounds the corners off and swallows the silhouette. */}
      <span
        key={bloomKey}
        className="animate-marker glow-warm absolute block rounded-none bg-warm"
        style={{ inset: 0 }}
      />
    </span>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S5Roi() {
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  /* Hover and focus are tracked apart: tabbing in with the keyboard and then
     moving the mouse away must keep the carousel frozen. */
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const paused = hovered || focused || tabHidden;
  const reduced = reduceMotion === true;
  const morph = reduced ? 0 : DURATION.morph;
  const fade = reduced ? 0 : DURATION.swap;

  const slide = SLIDES[active] ?? SLIDES[0];

  const go = useCallback((next: number) => {
    setActive(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  /* A timeout, not an interval: the dwell restarts whenever the carousel
     resumes, so returning from a hover or a backgrounded tab never lands the
     user mid-transition. */
  useEffect(() => {
    if (reduced) return;
    if (paused) return;

    const timer = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % SLIDE_COUNT);
    }, DURATION.dwell);

    return () => window.clearTimeout(timer);
  }, [active, paused, reduced]);

  useEffect(() => {
    const sync = () => setTabHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        setActive((prev) => (prev + 1) % SLIDE_COUNT);
        break;
      case "ArrowLeft":
        event.preventDefault();
        setActive((prev) => (prev - 1 + SLIDE_COUNT) % SLIDE_COUNT);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(SLIDE_COUNT - 1);
        break;
      default:
        break;
    }
  }, []);

  /* Focus is released only once it leaves the region entirely — otherwise
     tabbing between two pager buttons would resume the timer between them. */
  const onBlurCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    const inside = next instanceof Node && event.currentTarget.contains(next);
    if (!inside) setFocused(false);
  }, []);

  return (
    <section id="business-case" className="section-pad relative">
      <Container className="relative">
        <div className="grid grid-cols-12 gap-y-12 lg:gap-x-8">
          {/* --------------------------------------------------- HEADING */}
          <header className="col-span-12 max-w-[760px] lg:col-span-8">
            <Eyebrow>{SECTION_COPY.eyebrow}</Eyebrow>
            <h2 className="t-h2-mobile md:t-h2 mt-[22px]">
              {SECTION_COPY.heading}
            </h2>
          </header>

          {/* -------------------------------------------------- CAROUSEL */}
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Illustrative outcomes of a ScalMint engagement"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={onBlurCapture}
            onKeyDown={onKeyDown}
            className="col-span-12"
          >
            <div className="mt-[56px] grid grid-cols-12 items-start gap-y-12 lg:gap-x-8">
              {/* ------------------------------------ LEFT: CARD + PAGER */}
              <div className="col-span-12 flex flex-col lg:col-span-4">
                {/* The card box is fixed; each slide is a layer inset to
                    exactly that box, so the frame never resizes and only the
                    contents cross-fade. */}
                <div className="relative min-h-[300px] w-full max-w-[316px] rounded-card border border-line bg-surface-3 p-7">
                  {/* aria-live sits on this stable wrapper, never on a keyed
                      layer, so the live region survives the swap. */}
                  <div
                    aria-live="polite"
                    aria-atomic="true"
                    className="absolute inset-7"
                  >
                    {SLIDES.map((s, i) => (
                      <motion.div
                        key={s.id}
                        id={`roi-slide-${i + 1}`}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${i + 1} of ${SLIDE_COUNT}: ${s.stat}`}
                        aria-hidden={i !== active}
                        className="absolute inset-0 flex flex-col"
                        initial={false}
                        animate={{ opacity: i === active ? 1 : 0 }}
                        transition={{ duration: fade, ease: EASE_SWAP }}
                      >
                        <Eyebrow>{s.eyebrow}</Eyebrow>

                        <p className="text-stat mt-[14px] leading-none text-hi">
                          {s.stat}
                        </p>

                        {/* Two lines are always reserved so a one-line
                            sub-line cannot change the card's rhythm. */}
                        <p className="t-ui mt-[26px] min-h-[2.9em] font-semibold text-hi">
                          {s.subline}
                        </p>

                        <p className="mt-[14px] text-[12px] leading-[1.6] text-body">
                          {s.body}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Notch hanging off the card's bottom edge, aiming at a
                      marker the leader line has moved away from. */}
                  {slide.notch ? (
                    <motion.span
                      key={`notch-${slide.id}`}
                      aria-hidden="true"
                      className="absolute bottom-[-6px] left-[74%] block h-0 w-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-line"
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: fade, ease: EASE_SWAP }}
                    />
                  ) : null}
                </div>

                <div className="mt-[72px]">
                  <Pager
                    count={SLIDE_COUNT}
                    active={active}
                    label="Choose an outcome"
                    onSelect={go}
                    labels={SLIDES.map((s) => `Show ${s.stat} — ${s.subline}`)}
                    ids={SLIDES.map((_, i) => `roi-slide-${i + 1}`)}
                  />
                </div>
              </div>

              {/* ------------------------------- RIGHT: CHART + CAPTION */}
              <div className="col-span-12 lg:col-span-8">
                <div className="relative aspect-[877/500] w-full overflow-hidden">
                  {/* The blueprint grid needs its own layer: the fade utility
                      applies a mask, which would clip the SVG and the markers
                      if it sat on their shared parent. */}
                  <div
                    aria-hidden="true"
                    className="blueprint-fade-radial absolute inset-0"
                  />

                  {/* Purely a restatement of the stat card beside it, so it is
                      hidden from assistive tech and the value is read from the
                      card text. */}
                  <svg
                    aria-hidden="true"
                    viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="absolute inset-0 h-full w-full"
                  >
                    <motion.polyline
                      fill="none"
                      stroke={LINE_STROKE}
                      strokeWidth={LINE_WIDTH}
                      strokeLinejoin="miter"
                      initial={false}
                      animate={{ points: formatPoints(slide.vertices) }}
                      transition={{ duration: morph, ease: EASE_EXPO }}
                    />

                    <motion.polyline
                      fill="none"
                      stroke={LINE_STROKE}
                      strokeWidth={LINE_WIDTH}
                      strokeLinejoin="miter"
                      initial={false}
                      animate={{ points: leaderFor(slide) }}
                      transition={{ duration: morph, ease: EASE_EXPO }}
                    />

                    {/* Secondary white node on the leader, at the card edge. */}
                    <rect
                      x={LEADER_X - NODE_PX / 2}
                      y={CHART_MID_Y - NODE_PX / 2}
                      width={NODE_PX}
                      height={NODE_PX}
                      fill="#ffffff"
                    />

                    {/* Secondary white node pinned to a grid intersection. */}
                    <rect
                      x={CHART_NODE[0] - NODE_PX / 2}
                      y={CHART_NODE[1] - NODE_PX / 2}
                      width={NODE_PX}
                      height={NODE_PX}
                      fill="#ffffff"
                    />
                  </svg>

                  {MARKER_VERTICES.map((vertex, slot) => {
                    const [mx, my] = markerAt(slide, vertex);

                    return (
                      <ChartMarker
                        key={`marker-${slot}`}
                        x={mx}
                        y={my}
                        bloomKey={`${slide.id}-${slot}`}
                      />
                    );
                  })}
                </div>

                {/* Static by design, and deliberately outside every animated
                    wrapper so no transition can ever reach it. */}
                <div className="mt-[40px] text-right">
                  <h3 className="t-body-lg text-hi">{SECTION_COPY.caption}</h3>
                  <TextLink
                    href="/resources/business-case"
                    className="mt-[22px]"
                  >
                    {SECTION_COPY.link}
                    <ArrowUpRight />
                  </TextLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
