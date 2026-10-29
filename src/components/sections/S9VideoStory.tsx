"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  ArrowUpRight,
  ButtonLink,
  Container,
  Pager,
} from "@/components/ui/primitives";
import { DURATION, EASE_EXPO } from "@/lib/motion";

/* ============================================================================
   S9 — CUSTOMER STORIES / VIDEO CAROUSEL

   One video plate, three stories. The reference (`section9-video-bg.png` +
   `section9b.png`) is a full-bleed testimonial carousel: a fixed clip behind
   a left-hand text column, a wordmark, a 3-line quote, a paragraph, two
   buttons and a pager, plus a lower-third name plate that appears on one
   slide only.

   Only one clip ships in `public/`, so the video is deliberately constant and
   the *overlay* rotates. Inventing three clips would be a fabrication; the
   reference's structure is reproduced honestly instead.

   MEASUREMENTS — `section9-video-bg.png` is an 873px capture whose browser
   frame spans x 4..864 and y 8..532, i.e. an 861 x 524 window. The shell
   gutter resolves the scale twice and both agree:

     · gutter     text starts x=75, frame left x=4  -> 71/120 = 0.592
     · section    top y=45, bottom y=532           -> 487 / 0.592 = 822

   so scale = 0.598 and every number below is that measurement x 1.673.

     · section height       487px -> 814   (min-h here is 760; see below)
     · text column width          -> 466   (column left = shell left edge)
     · quote line pitch       27.5px -> 46.0   -> 44px / 1.05  (t-editorial
                                                        is 44px / 1.02, which
                                                        lands the pitch at 44.9)
     · body line pitch          16px -> 26.8   -> 17px / 1.52
     · button height            23px -> 38.5   -> btn-base 37px
     · wordmark cap height      20px -> 33.5
     · block centre            y=430 of814 = 52.7% — BELOW centre, not on it

   The ~20px vertical offset below centre is load-bearing and is reproduced
   with a translate, because hard-centring visibly lifts the block.

   WHY NOT `t-editorial` / `t-body-lg`. Both are Tailwind v4 `@utility`
   classes, which AGENTS.md is explicit about: a conflicting className in a
   wrapper silently loses to source-order in the compiled sheet, so they
   cannot be stepped down responsively. This quote is a smaller, non-standard
   size that has to survive 390px, so the two type sizes are written as
   explicit responsive utilities and the measurements above justify them.
   ========================================================================== */

/* --- Copy ------------------------------------------------------------------ */

type Wordmark = "serif" | "plain" | "tile";

type Slide = {
  readonly id: string;
  readonly client: string;
  readonly mark: Wordmark;
  /** Three lines, broken explicitly: the column is too narrow for the browser
   *  to break these the way the reference does. */
  readonly headline: readonly [string, string, string];
  readonly body: string;
  readonly plate?: { readonly name: string; readonly role: string };
};

const SLIDES: readonly Slide[] = [
  {
    id: "halverson",
    client: "Halverson",
    mark: "serif",
    headline: [
      "How Halverson turns",
      "dispatch data into",
      "decisions crews trust",
    ],
    body: "Eleven depots were quoting freight off spreadsheets that were a day out of date. We built the dispatch system and the structured record behind it, so pricing, routing and delay all read from the same place.",
  },
  {
    id: "vantry",
    client: "Vantry",
    mark: "plain",
    headline: ["How Vantry gives", "every clinic a front", "door that answers"],
    body: "Patients phoned a call centre that could not see their record. We shipped an AI receptionist wired into Vantry's scheduling data, so enquiries get answered, booked and written back the same day.",
  },
  {
    id: "orrick-field",
    client: "Orrick & Field",
    mark: "tile",
    headline: ["How Orrick & Field", "made ten years of", "paper queryable"],
    body: "Eleven years of interviews sat in boxes nobody could search. We digitised the archive into structured data, built the research interface over it, and put the findings in front of the people who commission the work.",
    plate: { name: "Simone Adeyemi", role: "Research Director" },
  },
];

const SLIDE_COUNT = SLIDES.length;

/* Only one slide is mounted at a time, so the pager's aria-controls cannot
   address per-slide elements that may not exist. Every control references the
   one stable region it actually mutates. */
const SLIDE_REGION_ID = "video-story-slide";

/* ============================================================================
   SCRIM

   The measured scrim is a *gradient*, not a wash. Sampling the capture gives
   #0C0C0C at the left edge, #131313 at ~40px and #181818 at ~60px, reaching
   transparent at ~117px of a 1440 frame — i.e. it is spent by 8% of the
   width. A flat overlay at that opacity erases the five people who occupy
   18%-78% of the clip, so the falloff is encoded literally in the stops:

     0%    0.97     1.4% (20px)  0.95
     2.8%  (40px)   0.86        4.2% (60px)  0.68
     5.6%  (80px)   0.44        6.9% (99px)  0.22
     8.1%  (117px)  0.06        9.6% (138px)  0

   The second layer is the weaker global wash the reference also has: it seats
   the nav at the top and the pager at the bottom and never takes the middle
   of the frame below 0.12, so the warm right-hand side still reads as light.

   `--color-page` is a literal hex in `@theme`, so `rgb(var(--color-page) / a)`
   is not valid CSS and the alpha has to come from color-mix. That keeps the
   scrim pointed at the token instead of a copy of its value.
   ========================================================================== */

const page = (alpha: number) =>
  `color-mix(in srgb, var(--color-page) ${Math.round(alpha * 100)}%, transparent)`;

const SCRIM_DESKTOP = `linear-gradient(to right,
  ${page(0.97)} 0%,
  ${page(0.95)} 1.4%,
  ${page(0.86)} 2.8%,
  ${page(0.68)} 4.2%,
  ${page(0.44)} 5.6%,
  ${page(0.22)} 6.9%,
  ${page(0.06)} 8.1%,
  ${page(0)} 9.6%), linear-gradient(to bottom,
  ${page(0.34)} 0%,
  ${page(0.12)} 32%,
  ${page(0.12)} 68%,
  ${page(0.36)} 100%)`;

/* Below the md breakpoint the column is full-bleed, so the same job has to be
   done across the whole frame instead of the left 10%. */
const SCRIM_MOBILE = `linear-gradient(to right,
  ${page(0.95)} 0%,
  ${page(0.9)} 32%,
  ${page(0.76)} 58%,
  ${page(0.46)} 82%,
  ${page(0.06)} 100%), linear-gradient(to bottom,
  ${page(0.3)} 0%,
  ${page(0.08)} 34%,
  ${page(0.34)} 100%)`;

/* ============================================================================
   WORDMARKS

   Three invented clients, three treatments, all drawn rather than set: the
   reference changes the *kind* of mark between slides, so a single repeated
   lockup would flatten the carousel. Each is authored on a fixed 56-unit
   lockup so the row height — and therefore the quote's position — never
   moves when the slide does.
   ========================================================================== */

const SERIF_FONT = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

function MarkTile({ size, label }: { size: number; label: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <rect width="56" height="56" rx="13" fill="var(--color-hi)" />
      <text
        x="28"
        y="37"
        textAnchor="middle"
        fill="var(--color-page)"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        O&amp;F
      </text>
    </svg>
  );
}

function Wordmark({ slide }: { slide: Slide }) {
  return (
    <>
      <span className="sr-only">{slide.client} — </span>

      {slide.mark === "serif" ? (
        <svg
          width={240}
          height={56}
          viewBox="0 0 240 56"
          aria-hidden="true"
          focusable="false"
          className="shrink-0 text-hi"
        >
          <text
            x="0"
            y="40"
            fill="currentColor"
            style={{
              fontFamily: SERIF_FONT,
              fontSize: 42,
              letterSpacing: "-0.01em",
            }}
          >
            Halverson
          </text>
        </svg>
      ) : null}

      {slide.mark === "plain" ? (
        <svg
          width={200}
          height={56}
          viewBox="0 0 200 56"
          aria-hidden="true"
          focusable="false"
          className="shrink-0 text-hi"
        >
          <path d="M2 28 L15 15 L28 28 L15 41 Z" fill="currentColor" />
          <text
            x="42"
            y="40"
            fill="currentColor"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            Vantry
          </text>
        </svg>
      ) : null}

      {slide.mark === "tile" ? (
        <svg
          width={310}
          height={56}
          viewBox="0 0 310 56"
          aria-hidden="true"
          focusable="false"
          className="shrink-0 text-hi"
        >
          <rect width="56" height="56" rx="13" fill="var(--color-hi)" />
          <text
            x="28"
            y="37"
            textAnchor="middle"
            fill="var(--color-page)"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            O&amp;F
          </text>
          <text
            x="72"
            y="39"
            fill="currentColor"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.025em",
            }}
          >
            Orrick &amp; Field
          </text>
        </svg>
      ) : null}
    </>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S9VideoStory() {
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  /* Hover and focus are tracked separately: a keyboard user who tabs in and
     then moves the pointer away must keep the carousel frozen. */
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const paused = hovered || focused || tabHidden;
  const slide = SLIDES[active] ?? SLIDES[0];

  const go = useCallback((next: number) => {
    setActive(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  /* A timeout rather than an interval: the dwell restarts whenever the
     carousel resumes, so returning from a hover or a hidden tab never lands
     the reader mid-transition. */
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

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* The clip is decorative and sits below the fold, so it never plays on its
     own. Four gates, all of which must be open: motion is allowed, the section
     is actually on screen, the tab is foregrounded, and the reader is not
     holding the carousel. Anything else parks the video on its poster. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reduceMotion !== false || !inView || paused) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      /* Autoplay refused. The poster is the designed fallback; nothing to do. */
    });
  }, [reduceMotion, inView, paused]);

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
    const stillInside =
      next instanceof Node && event.currentTarget.contains(next);
    if (!stillInside) setFocused(false);
  }, []);

  const still = reduceMotion === true;

  function slideContent(current: Slide): ReactNode {
    return (
      <>
        {/* Fixed-height row: the mark changes shape per slide, the quote must not move. */}
        <div className="flex h-14 items-center">
          <Wordmark slide={current} />
        </div>

        {/* No id on the heading: during the cross-dissolve two slides are in the
            document at once, and a repeated id would be invalid. */}
        <h2 className="mt-8 text-[30px] font-normal leading-[1.05] tracking-[-0.02em] text-hi md:text-[44px]">
          {current.headline[0]}
          <br />
          {current.headline[1]}
          <br />
          {current.headline[2]}
        </h2>

        <p className="mt-6 max-w-[466px] text-[16px] leading-[1.55] text-body md:text-[17px] md:leading-[1.52]">
          {current.body}
        </p>
      </>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="stories"
      aria-label="Customer stories"
      className="relative isolate flex min-h-[814px] flex-col overflow-hidden bg-page"
    >
      {/* The clip is decoration. Every word of meaning is in the text column, so
          it is removed from the accessibility tree entirely. */}
      <video
        ref={videoRef}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "62% 50%" }}
        src="/video/bg-testimonial-01.mp4"
        poster="/people/video-tile-06.jpg"
        preload="none"
        muted
        playsInline
        loop
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{ backgroundImage: SCRIM_DESKTOP }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{ backgroundImage: SCRIM_MOBILE }}
      />

      {/* `section-pad` lives on the container, not the section: absolute
          children resolve against an ancestor's *padding* box, so the pager and
          the plate can anchor to the true bottom edge of the section while the
          copy still centres inside the padded content box. `flex-1` gives the
          container the section's full height to resolve against. */}
      <Container className="section-pad relative flex flex-1 flex-col justify-center">
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer story"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={onBlurCapture}
          onKeyDown={onKeyDown}
          className="relative"
        >
          {/* Measured block centre is 52.7% of the section, not 50% — the
              reference sits a shade low. Hard-centring lifts it visibly, so the
              copy column carries the 20px the measurement calls for (380 -> 400
              in a 760 section). The pager and plate stay anchored to the
              section, so only the copy moves. */}
          <div className="w-full max-w-[466px] translate-y-[20px]">
            {/* Grid-stacked so the outgoing and incoming slides occupy the same
                cell: a true cross-dissolve that never collapses the row height
                and never nudges the button row below it. */}
            <div
              id={SLIDE_REGION_ID}
              aria-live="polite"
              aria-atomic="true"
              className="grid [&>*]:col-start-1 [&>*]:row-start-1"
            >
              <AnimatePresence initial={false} mode="sync">
                <motion.div
                  key={slide.id}
                  initial={still ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={still ? { opacity: 1 } : { opacity: 0, y: -12 }}
                  transition={
                    still
                      ? { duration: 0, ease: EASE_EXPO }
                      : { duration: 0.3, ease: EASE_EXPO }
                  }
                >
                  {slideContent(slide)}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <ButtonLink href={`#story-${slide.id}`}>
                Read the story
                <ArrowUpRight size={13} />
              </ButtonLink>
              <ButtonLink href="#stories" variant="ghost">
                All customer stories
              </ButtonLink>
            </div>
          </div>

          {/* Lower third — one slide only, entering from the bottom right and
              anchored to the container's right edge, which is why it sits
              outside the copy column. On mobile it falls back into the flow so
              it can never sit on top of the text. */}
          <AnimatePresence initial={false}>
            {slide.plate ? (
              <motion.div
                key={`plate-${slide.id}`}
                initial={still ? false : { opacity: 0, x: 36, y: 44 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={still ? { opacity: 1 } : { opacity: 0, x: 24, y: 30 }}
                transition={
                  still
                    ? { duration: 0, ease: EASE_EXPO }
                    : { duration: 0.6, ease: EASE_EXPO }
                }
                className="mt-11 flex items-center gap-6 md:absolute md:right-0 md:bottom-[40px] md:mt-0"
              >
                <MarkTile size={118} label={`${slide.client} logo`} />

                <span className="flex flex-col gap-1.5">
                  <span className="text-[28px] font-normal leading-[1.1] tracking-[-0.02em] text-hi md:text-[32px]">
                    {slide.plate.name}
                  </span>
                  <span className="text-[18px] leading-[1.2] text-body md:text-[20px]">
                    {slide.plate.role}
                  </span>
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="relative z-10 mt-16 md:absolute md:bottom-[240px] md:left-0 md:mt-0">
            <Pager
              count={SLIDE_COUNT}
              active={active}
              label="Choose a customer story"
              onSelect={go}
              labels={SLIDES.map((s) => `Show the ${s.client} story`)}
              ids={SLIDES.map(() => SLIDE_REGION_ID)}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
