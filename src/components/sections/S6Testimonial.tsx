"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Container, Eyebrow, Pager } from "@/components/ui/primitives";
import { DURATION, EASE_EXPO } from "@/lib/motion";

/* ============================================================================
   S6 — TESTIMONIAL

   One left-aligned block: portrait, quote, byline, pager. The only background
   layer is the wireframe mosaic.

   Geometry is measured off the reference at 1440x900. The block is 980px wide
   and sits at the container's left edge: 100px for the portrait column (73px
   avatar + 27px gutter) and an 880px quote column.

   QUOTE MEASURE — the quote is 44px, not the 64px of `t-h2`: the reference's
   line pitch samples at ~41px, and 44px is this page's editorial register
   (`--text-editorial`). But the copy is only long enough to fill five lines in
   a narrow measure, so the blockquote is capped at 628px rather than filling
   the 880px column. Measured on the running dev server, 598-658px is the whole
   band in which all three quotes land on exactly five lines at 44px; 628px is
   the centre, so neither edge is within rounding of a re-wrap. The *byline row*
   below stays the full 880px — capping the blockquote alone keeps the wordmark
   and the pager on their measured positions. Do not reword the quotes without
   re-measuring the band.

   The portrait needs no optical lift. Inter's cap top sits ~10px below its line
   box top, so a grid with `items-start` already puts the avatar 10px above the
   first line's caps, which is exactly where the reference has it.
   ========================================================================== */

/* --- Copy ----------------------------------------------------------------- */

type Slide = {
  id: string;
  quote: string;
  company: string;
  name: string;
  role: string;
  avatar: string;
  alt: string;
};

const SLIDES: readonly Slide[] = [
  {
    id: "kestrel",
    quote:
      "\"We were quoting freight off spreadsheets that were a day out of date. ScalMint rebuilt the pipeline, so dispatch and pricing read from one record.\"",
    company: "Kestrel",
    name: "Priya Raghunathan",
    role: "Chief Operating Officer",
    avatar: "/people/avatar-09.jpg",
    alt: "Priya Raghunathan, Chief Operating Officer at Kestrel",
  },
  {
    id: "northbank",
    quote:
      "\"Every branch had its own idea of what a customer was worth. Now there is one structured record, and the answers come out of it.\"",
    company: "Northbank",
    name: "Declan Moss",
    role: "Director of Digital Operations",
    avatar: "/people/avatar-11.jpg",
    alt: "Declan Moss, Director of Digital Operations at Northbank",
  },
  {
    id: "vireo",
    quote:
      "\"The grid data was already there and unusable. It is cleaned, queryable and in front of field engineers before they phone head office.\"",
    company: "Vireo",
    name: "Ryo Tanabe",
    role: "Head of Platform Engineering",
    avatar: "/people/avatar-05.jpg",
    alt: "Ryo Tanabe, Head of Platform Engineering at Vireo",
  },
];

const SLIDE_COUNT = SLIDES.length;

/* Stable id for the slide region. Only one slide is mounted at a time, so the
   pager's aria-controls cannot point at per-slide elements that may not be in
   the document; every control instead references the region it mutates. */
const SLIDE_REGION_ID = "testimonial-slide";

/* ============================================================================
   MOSAIC

   A scattered lattice of 38px outline squares. Built as one SVG rather than
   CSS gradients because the reference is a *scattered* grid, not a uniform
   one, and background-image cannot drop individual cells.

   The cell set is generated at module scope from an integer hash, not
   Math.random: deterministic, so the server and client render identical
   markup and the pattern is stable across reloads. Density comes from two
   terms — smooth value noise for the clustered, patchy distribution the
   reference shows, and a radial falloff matched to the CSS mask so cells are
   absent where they would have been faded away anyway instead of being painted
   and then hidden.
   ========================================================================== */

const CELL = 38;
const COLS = 38;
const ROWS = 13;

/* Four existing tones, weighted so --color-wire (#131313) is the peak the
   reference samples at. */
const TONES = [
  "var(--color-wire-dim)",
  "var(--color-grid)",
  "var(--color-wire)",
  "var(--color-surface-3)",
] as const;

function lattice(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const sx = x - xi;
  const sy = y - yi;
  const ux = sx * sx * (3 - 2 * sx);
  const uy = sy * sy * (3 - 2 * sy);
  const top = lattice(xi, yi) * (1 - ux) + lattice(xi + 1, yi) * ux;
  const bottom = lattice(xi, yi + 1) * (1 - ux) + lattice(xi + 1, yi + 1) * ux;
  return top * (1 - uy) + bottom * uy;
}

const MOSAIC = (() => {
  const cells: { x: number; y: number; stroke: string }[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const dx = (col + 0.5) / COLS - 0.44;
      const dy = (row + 0.5) / ROWS - 0.5;
      const falloff = Math.max(0, 1 - Math.hypot(dx / 0.62, dy / 0.7));
      const clump = valueNoise(col / 6.5, row / 5.5);

      if (lattice(col + 91, row + 7) > 0.16 + 0.4 * falloff + 0.46 * clump) {
        continue;
      }

      const t = lattice(col + 13, row + 51);
      const tone = t > 0.78 ? 3 : t > 0.22 ? 2 : t > 0.08 ? 1 : 0;

      cells.push({
        x: col * CELL + 0.5,
        y: row * CELL + 0.5,
        stroke: TONES[tone],
      });
    }
  }

  return cells;
})();

function Mosaic() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center"
    >
      <div
        className="h-[460px] w-full"
        style={{
          maskImage:
            "radial-gradient(ellipse 62% 66% at 44% 50%, #000 0%, #000 38%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 62% 66% at 44% 50%, #000 0%, #000 38%, transparent 78%)",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          {MOSAIC.map((cell) => (
            <rect
              key={`${cell.x}-${cell.y}`}
              x={cell.x}
              y={cell.y}
              width={CELL - 1}
              height={CELL - 1}
              fill="none"
              stroke={cell.stroke}
              strokeWidth={1}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ============================================================================
   CLIENT WORDMARKS

   Invented brands, drawn rather than set as text so they read as marks. Each
   occupies the same 120px lockup so the divider and byline text hold their
   position when the slide changes.
   ========================================================================== */

const WORDMARK_TEXT = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.18em",
  fontWeight: 400,
} as const;

function Wordmark({ slide }: { slide: Slide }) {
  return (
    <svg
      width={120}
      height={24}
      viewBox="0 0 120 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 text-[#ededed]"
    >
      {slide.id === "kestrel" ? (
        <>
          <rect x="0" y="3" width="20" height="2.6" rx="1.3" />
          <rect x="0" y="10.1" width="14" height="2.6" rx="1.3" />
          <rect x="0" y="17.2" width="8" height="2.6" rx="1.3" />
        </>
      ) : null}

      {slide.id === "northbank" ? (
        <>
          <rect x="0.6" y="2" width="2.8" height="20" rx="1.4" />
          <rect x="16.6" y="2" width="2.8" height="20" rx="1.4" />
          <rect x="0.6" y="2" width="18.8" height="2.8" rx="1.4" />
        </>
      ) : null}

      {slide.id === "vireo" ? (
        <>
          <circle
            cx="10.5"
            cy="12"
            r="8.6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
          />
          <circle cx="10.5" cy="12" r="2.5" />
        </>
      ) : null}

      <text x="30" y="12" dominantBaseline="central" style={WORDMARK_TEXT}>
        {slide.company.toUpperCase()}
      </text>
    </svg>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S6Testimonial() {
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  /* Hover and focus are tracked separately: a keyboard user who tabs in and
     then moves the mouse away must keep the carousel frozen. */
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const paused = hovered || focused || tabHidden;
  const slide = SLIDES[active] ?? SLIDES[0];

  const go = useCallback((next: number) => {
    setActive(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  /* A timeout rather than an interval: the dwell restarts whenever the
     carousel resumes, so coming back from a hover or a hidden tab never lands
     the user mid-transition. */
  useEffect(() => {
    if (reduceMotion === true) return;
    if (paused) return;

    const timer = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % SLIDE_COUNT);
    }, DURATION.dwell);

    return () => window.clearTimeout(timer);
  }, [active, paused, reduceMotion]);

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

  /* Focus is released only when it leaves the carousel entirely — otherwise
     tabbing between two controls would resume the timer between them. */
  const onBlurCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    const stillInside = next instanceof Node && event.currentTarget.contains(next);
    if (!stillInside) setFocused(false);
  }, []);

  return (
    <section id="testimonial" className="section-pad relative overflow-hidden">
      <Mosaic />

      <Container className="relative">
        <h2 className="sr-only">What our clients say</h2>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Client testimonials"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={onBlurCapture}
          onKeyDown={onKeyDown}
          className="max-w-[980px]"
        >
          {/* aria-live sits on this stable wrapper, never on the keyed slide,
              so the live region survives the swap and actually announces it. */}
          <div aria-live="polite" aria-atomic="true">
            <motion.figure
              key={slide.id}
              id={SLIDE_REGION_ID}
              initial={
                reduceMotion === true ? false : { opacity: 0, y: 14 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion === true ? 0 : DURATION.micro * 2,
                ease: EASE_EXPO,
              }}
              className="grid grid-cols-1 items-start gap-y-7 lg:grid-cols-[73px_minmax(0,1fr)] lg:gap-x-[27px]"
            >
              <Image
                src={slide.avatar}
                alt={slide.alt}
                width={600}
                height={600}
                sizes="73px"
                loading="lazy"
                className="h-[73px] w-[73px] rounded-[10px] border border-line object-cover"
              />

              <div className="min-w-0">
                {/* The quote is the one place `t-h2` cannot be used: it is a
                    custom @utility, so no className override can bring it off
                    64px. Type and measure are set explicitly instead, at the
                    page's editorial register. See QUOTE MEASURE in the header. */}
                <blockquote className="max-w-[628px] text-[30px] font-normal leading-[1.05] tracking-[-0.03em] text-hi md:text-[44px]">
                  {slide.quote}
                </blockquote>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                  <figcaption className="flex items-stretch gap-8">
                    <Wordmark slide={slide} />

                    <span
                      aria-hidden="true"
                      className="w-px shrink-0 bg-line"
                    />

                    <cite className="flex flex-col justify-center not-italic">
                      <span className="sr-only">{slide.company} — </span>
                      <Eyebrow className="text-[#ededed]">
                        {slide.name}
                      </Eyebrow>
                      <Eyebrow className="text-[#9a9a9a]">{slide.role}</Eyebrow>
                    </cite>
                  </figcaption>

                  <Pager
                    count={SLIDE_COUNT}
                    active={active}
                    label="Choose a testimonial"
                    onSelect={go}
                    labels={SLIDES.map(
                      (s) => `Show the testimonial from ${s.name} at ${s.company}`,
                    )}
                    ids={SLIDES.map(() => SLIDE_REGION_ID)}
                  />
                </div>
              </div>
            </motion.figure>
          </div>
        </div>
      </Container>
    </section>
  );
}