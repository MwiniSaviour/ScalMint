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
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CodeXml,
  Database,
  Lock,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import {
  BetaChip,
  Container,
  Eyebrow,
  Heading2,
} from "@/components/ui/primitives";
import { DURATION, EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ============================================================================
   S4 — SELECTED WORK

   The reference for this section frames a product figure inside a bordered
   gradient panel, with a four-column service row underneath. We keep that
   outer chrome exactly and replace the figure's contents: instead of a mock
   analytics dashboard, the panel carries a four-slide carousel of ScalMint's
   own case studies.

   The chrome frame is load-bearing, not decoration. Every project screenshot
   is a bright, light-on-white product UI. Dropped straight onto #0A0A0A it
   reads as pasted-in; nested inside a dark browser frame it reads as a lit
   screen in a dark room, and the panel gradient has something to sit on.
   ========================================================================== */

/* --- Case studies --------------------------------------------------------- */

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  caption: string;
  /** Shown in the browser-chrome URL pill. */
  path: string;
  src: string;
  alt: string;
  /** 40x25 base64 JPEG used as the blur-up placeholder. */
  lqip: string;
};

const SLIDES: readonly Slide[] = [
  {
    id: "operasch",
    eyebrow: "Case study 01",
    title: "Operasch",
    caption:
      "Attendance, timetables, results and inventory in one place — replacing nine tools a school had long since outgrown.",
    path: "/work/operasch",
    src: "/projects/work-01-operasch-home.jpg",
    alt: "Operasch school management dashboard showing attendance counts, timetable and inventory panels beside a term calendar.",
    lqip: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDACweISchHCwnJCcyLyw1Qm9IQj09QohhZlBvoY2ppp6Nm5ixx//Ysbzxv5ib3v/g8f//////rNX/////////////2wBDAS8yMkI6QoJISIL/t5u3////////////////////////////////////////////////////////////////////wgARCAAZACgDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAIDAQT/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABjQqiZdTnHBKQdbZMAQP/xAAYEAEBAQEBAAAAAAAAAAAAAAAAEQEQIP/aAAgBAQABBQKIiIxndYqq3fX/xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAEDAQE/AV//xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAECAQE/AV//xAAUEAEAAAAAAAAAAAAAAAAAAABA/9oACAEBAAY/Aif/xAAXEAEBAQEAAAAAAAAAAAAAAAABABAR/9oACAEBAAE/ISGbXAXJwoxchGM3/9oADAMBAAIAAwAAABCMc/zrz//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8QX//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8QX//EABgQAAMBAQAAAAAAAAAAAAAAAAABERAg/9oACAEBAAE/ELYLJIUQJBUKiOcYU6n/2Q==",
  },
  {
    id: "operasch-finance",
    eyebrow: "Case study 02",
    title: "Operasch Finance",
    caption:
      "Fees, receivables and payroll reconcile against the same student record, so nothing is re-keyed between the register and the bank.",
    path: "/work/operasch/finance",
    src: "/projects/work-02-operasch-finance.jpg",
    alt: "Operasch Finance billing module showing a collections chart and a fees table listing tuition, activities and miscellaneous charges per student.",
    lqip: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDACweISchHCwnJCcyLyw1Qm9IQj09QohhZlBvoY2ppp6Nm5ixx//Ysbzxv5ib3v/g8f//////rNX/////////////2wBDAS8yMkI6QoJISIL/t5u3////////////////////////////////////////////////////////////////////wgARCAAZACgDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAMEAgH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEaOFYo4RjQy2VhRlXAFh//xAAZEAEBAQEBAQAAAAAAAAAAAAABABICECD/2gAIAQEAAQUCCzZnmSPWYbVqepY+G//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8BX//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8BX//EABQQAQAAAAAAAAAAAAAAAAAAAED/2gAIAQEABj8CJ//EABcQAQEBAQAAAAAAAAAAAAAAAAEgEAD/2gAIAQEAAT8h5JRkuSEMcf/aAAwDAQACAAMAAAAQAIAQAw//xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAEDAQE/EF//xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAECAQE/EF//xAAbEAADAAMBAQAAAAAAAAAAAAAAAREhMUEQIP/aAAgBAQABPxCxfg8NEOEicGniJoVEBU2QIfSv0H//2Q==",
  },
  {
    id: "modernmind",
    eyebrow: "Case study 03",
    title: "ModernMind",
    caption:
      "Courses, live sessions and community in a single membership platform that members come back to between sessions.",
    path: "/work/modernmind",
    src: "/projects/work-03-modernmind.jpg",
    alt: "ModernMind community platform home feed with a welcome banner, a creator post and panels for upcoming events and trending posts.",
    lqip: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDACweISchHCwnJCcyLyw1Qm9IQj09QohhZlBvoY2ppp6Nm5ixx//Ysbzxv5ib3v/g8f//////rNX/////////////2wBDAS8yMkI6QoJISIL/t5u3////////////////////////////////////////////////////////////////////wgARCAAZACgDASIAAhEBAxEB/8QAGAABAAMBAAAAAAAAAAAAAAAAAwABBAL/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABNOmoK1cmOLIpsqGjkqJDh//EABgQAQEBAQEAAAAAAAAAAAAAAAEAEhAg/9oACAEBAAEFAgs2bMkRxmGG1LLHhv/EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8BX//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8BX//EABQQAQAAAAAAAAAAAAAAAAAAAED/2gAIAQEABj8CJ//EABgQAQEBAQEAAAAAAAAAAAAAAAEAEBEg/9oACAEBAAE/IYMHAYXIR9yQY4//2gAMAwEAAgADAAAAENKPqADP/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAwEBPxBf/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAgEBPxBf/8QAGhAAAwADAQAAAAAAAAAAAAAAAAERIEFRcf/aAAgBAQABPxCpTR5JaIiBMJEiBKE9I6J6KeQf/9k=",
  },
  {
    id: "pulse-fm",
    eyebrow: "Case study 04",
    title: "Pulse FM",
    caption:
      "A live schedule and player that stay in sync straight from the studio, with no separate CMS for anyone to maintain.",
    path: "/work/pulse-fm",
    src: "/projects/work-04-pulse-fm.jpg",
    alt: "Pulse Radio homepage with a hero player for Good Morning Ghana, a now-on-air schedule and a panel for listening on other devices.",
    lqip: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDACweISchHCwnJCcyLyw1Qm9IQj09QohhZlBvoY2ppp6Nm5ixx//Ysbzxv5ib3v/g8f//////rNX/////////////2wBDAS8yMkI6QoJISIL/t5u3////////////////////////////////////////////////////////////////////wgARCAAZACgDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAIDAQT/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAABRypJOhI5xitpBiqpgCB//8QAGBAAAwEBAAAAAAAAAAAAAAAAAAERECD/2gAIAQEAAQUCSIQmLWMTKUvf/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAwEBPwFf/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAgEBPwFf/8QAFBABAAAAAAAAAAAAAAAAAAAAQP/aAAgBAQAGPwIn/8QAFxABAQEBAAAAAAAAAAAAAAAAAQAQIP/aAAgBAQABPyHTYmCeAM2LGs3/2gAMAwEAAgADAAAAEGOzYKDP/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAwEBPxBf/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAgEBPxBf/8QAFxABAQEBAAAAAAAAAAAAAAAAAAEREP/aAAgBAQABPxDVCmbNlhEREMOFN2/EXp//2Q==",
  },
];

const SLIDE_COUNT = SLIDES.length;

/* --- Service row ---------------------------------------------------------- */

type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
  /** The two capabilities still settling into a stable shape. */
  beta: boolean;
};

const FEATURES: readonly Feature[] = [
  {
    title: "Software development",
    body: "Web, mobile and desktop applications on one architecture, shipped in slices you can put in front of real users.",
    icon: CodeXml,
    beta: false,
  },
  {
    title: "AI automation",
    body: "WhatsApp and email receptionists that qualify, route and answer — with a clean handover to a person when it matters.",
    icon: Workflow,
    beta: false,
  },
  {
    title: "Structured data",
    body: "Scattered records pulled into one clean, queryable place, with the research that shows what is worth acting on.",
    icon: Database,
    beta: true,
  },
  {
    title: "Model fine-tuning",
    body: "Your own data used to train models that answer in your domain, on your terms, at a fraction of prompt cost.",
    icon: BrainCircuit,
    beta: true,
  },
];

const FEATURE_COUNT = FEATURES.length;

/**
 * Scrubber mark offsets, as `left` values on a full-measure rail.
 *
 * The feature row is `grid-cols-4 gap-x-8` inside the container, so a cell is
 * (W - 3*32)/4 wide and cell i starts at i * (W/4 + 8). The centre of cell i,
 * less half a 10px mark, is therefore 12.5% + 25%*i + (8i - 17)px of the
 * container. Derived from the grid rather than hand-fitted to 1200px so the
 * handle meets its tick at every width instead of drifting a few pixels.
 */
const MARK_LEFT: readonly string[] = FEATURES.map((_, i) => {
  const nudge = 8 * i - 17;
  return `calc(${12.5 + 25 * i}% ${nudge < 0 ? "-" : "+"} ${Math.abs(nudge)}px)`;
});

/* --- Copy ----------------------------------------------------------------- */

const LEDE =
  "At ScalMint, we see digital transformation as a responsibility of every modern business—not merely a way to be online, but a way to operate smarter, reach further, and grow faster.";

const CLOSING =
  "We build scalable digital systems that turn business needs into measurable results. From web and mobile applications to automation, structured data, and AI model fine-tuning, our solutions are designed to improve efficiency, strengthen customer engagement, and create lasting business value.";

/* ============================================================================
   BROWSER CHROME
   ========================================================================== */

function ChromeBar({ path }: { path: string }) {
  return (
    <div className="flex h-10 items-center gap-4 border-b border-line bg-surface-3 px-4">
      <span aria-hidden="true" className="flex shrink-0 items-center gap-[6px]">
        <span className="block h-[7px] w-[7px] rounded-full bg-surface-2" />
        <span className="block h-[7px] w-[7px] rounded-full bg-surface-2" />
        <span className="block h-[7px] w-[7px] rounded-full bg-surface-2" />
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-2 rounded-[6px] bg-page px-3 py-[6px]">
        <Lock
          size={10}
          strokeWidth={1.5}
          aria-hidden="true"
          className="shrink-0 text-eyebrow"
        />
        <span className="truncate font-mono text-[11px] leading-none text-muted">
          {path}
        </span>
      </span>
    </div>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S4Work() {
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  /* Which capability the scrubber is parked on. Set by click and by focus, so
     tabbing through the row walks the handle the same way the pointer does. */
  const [featureActive, setFeatureActive] = useState(0);
  /* Hover and focus are tracked separately: a keyboard user who tabs in and
     then moves the mouse away must keep the carousel frozen. */
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const paused = hovered || focused || tabHidden;
  const fade = reduceMotion === true ? 0 : DURATION.swap;

  const slide = SLIDES[active] ?? SLIDES[0];

  const go = useCallback((next: number) => {
    setActive(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  /* A timeout rather than an interval: the dwell restarts whenever the carousel
     resumes, so coming back from a hover or a hidden tab never lands the user
     mid-transition. */
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
    const stillInside =
      next instanceof Node && event.currentTarget.contains(next);
    if (!stillInside) setFocused(false);
  }, []);

  return (
    <section id="work" className="section-pad relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] wire-rects"
      />

      <Container className="relative z-10">
        <header className="max-w-[780px]">
          <Eyebrow>Selected work</Eyebrow>
          <Heading2 className="mt-[22px]">
            Four systems, built end to end.
          </Heading2>
          <p className="t-body-lg mt-[26px] max-w-[700px] text-body">{LEDE}</p>
        </header>

        {/* ------------------------------------------------- CAROUSEL PANEL */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Selected case studies"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={onBlurCapture}
          onKeyDown={onKeyDown}
          className="mt-[56px] rounded-tile border border-line bg-surface-3 p-4"
        >
          {/* The chrome frame. Light screenshots inside a dark shell keep the
              panel from reading as two unrelated pieces of imagery. */}
          <div className="overflow-hidden rounded-t-pill border border-line">
            <ChromeBar path={slide.path} />

            <div className="relative aspect-[16/10] w-full bg-page">
              {SLIDES.map((s, i) => {
                const isActive = i === active;

                return (
                  <motion.div
                    key={s.id}
                    id={`work-slide-${i + 1}`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${SLIDE_COUNT}`}
                    aria-hidden={!isActive}
                    className="absolute inset-0"
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: fade, ease: EASE_EXPO }}
                  >
                    <Image
                      src={s.src}
                      alt={s.alt}
                      width={1600}
                      height={1000}
                      sizes="(min-width:1280px) 1168px, 100vw"
                      className="h-full w-full object-cover"
                      placeholder="blur"
                      blurDataURL={s.lqip}
                      priority={i === 0}
                      loading={i === 0 ? undefined : "lazy"}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Slide caption + controls. aria-live lives here rather than on a
              separate sr-only mirror, so the announced text is the text on
              screen and can never drift out of sync with it. */}
          <div className="mt-4 flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div aria-live="polite" aria-atomic="true" className="min-w-0">
              <motion.div
                key={slide.id}
                initial={reduceMotion === true ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion === true ? 0 : DURATION.micro * 2,
                  ease: EASE_EXPO,
                }}
              >
                <Eyebrow>{slide.eyebrow}</Eyebrow>
                <h3 className="t-h3 mt-[10px] text-hi">{slide.title}</h3>
                <p className="mt-[10px] max-w-[600px] text-[15px] leading-[1.45] text-body">
                  {slide.caption}
                </p>
              </motion.div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                role="group"
                aria-label="Choose a case study"
                className="flex items-center gap-1"
              >
                {SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show case study ${i + 1}: ${s.title}`}
                    aria-current={i === active ? "true" : undefined}
                    className="flex h-8 w-8 items-center justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block h-[6px] w-[6px] rounded-full transition-colors",
                        i === active ? "bg-hi" : "bg-surface-2 hover:bg-muted",
                      )}
                    />
                  </button>
                ))}
              </div>

              <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />

              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label="Previous case study"
                className="flex h-9 w-9 items-center justify-center rounded-card border border-line text-body transition-colors hover:border-line-node hover:bg-surface-1 hover:text-hi"
              >
                <ChevronLeft size={16} strokeWidth={1} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label="Next case study"
                className="flex h-9 w-9 items-center justify-center rounded-card border border-line text-body transition-colors hover:border-line-node hover:bg-surface-1 hover:text-hi"
              >
                <ChevronRight size={16} strokeWidth={1} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------ SERVICE ROW */}
        <ul className="mt-[64px] grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const isActive = i === featureActive;

            return (
              <li key={feature.title} className="relative">
                {/* Warm rule and the icon's colour are the non-motion cues for
                    which capability is parked on the scrubber. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -top-6 left-0 h-px w-6",
                    isActive ? "bg-warm" : "bg-transparent",
                  )}
                />
                <Icon
                  size={40}
                  strokeWidth={1}
                  aria-hidden="true"
                  className={cn(
                    "transition-colors",
                    isActive ? "text-hi" : "text-muted",
                  )}
                />
                <h3 className="t-h3 mt-[22px] flex items-center gap-3 text-hi">
                  {feature.title}
                  {feature.beta ? <BetaChip /> : null}
                </h3>
                <p className="mt-[12px] text-[16px] leading-[1.5] text-body">
                  {feature.body}
                </p>

                {/* Stretched control rather than a button inside the column:
                    the list keeps its semantics and the measured spacing stays
                    exactly as the reference drew it. */}
                <button
                  type="button"
                  aria-label={`Feature ${i + 1} of ${FEATURE_COUNT}: ${feature.title}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setFeatureActive(i)}
                  onFocus={() => setFeatureActive(i)}
                  className="absolute inset-0 cursor-pointer rounded-card"
                />
              </li>
            );
          })}
        </ul>

        {/* --------------------------------------------------------- SCRUBBER
            1px rail on the container measure, a 10px square handle parked on
            the active column's mark. The marks are decorative — the features
            above are the real controls, so ticking them would only duplicate
            four tab stops for the same four actions.

            Below `lg` the row is two columns and then one, where a horizontal
            position on the rail maps to nothing the eye can relate to a
            stacked feature. So the rail hides rather than pretending to still
            mean something; the warm rule, the icon colour and aria-current
            still carry the active state at those widths. */}
        <div
          aria-hidden="true"
          className="relative mt-[40px] hidden h-[10px] w-full lg:block"
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-wire" />

          {FEATURES.map((feature, i) => (
            <span
              key={feature.title}
              style={{ left: MARK_LEFT[i] }}
              className={cn(
                "absolute top-0 h-[10px] w-[10px] transition-colors",
                i === featureActive ? "bg-hi" : "bg-line-node",
              )}
            />
          ))}

          <motion.div
            className="absolute top-0 h-[10px] w-[10px] bg-hi"
            initial={false}
            animate={{ left: MARK_LEFT[featureActive] ?? MARK_LEFT[0] }}
            transition={
              reduceMotion === true
                ? { duration: 0 }
                : { duration: DURATION.swap, ease: EASE_EXPO }
            }
          />
        </div>

        <p className="t-body-lg mt-[72px] max-w-[780px] text-muted">
          {CLOSING}
        </p>
      </Container>
    </section>
  );
}
