"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";

type InViewMargin = NonNullable<
  NonNullable<Parameters<typeof useInView>[1]>
>["margin"];

/* ---------------------------------------------------------------------------
   Shared motion vocabulary. The easing curves and durations are measured /
   inferred from the reference's a/b state pairs — use these rather than
   inventing new ones so the whole page feels like one system.
   ------------------------------------------------------------------------- */

export const EASE_EXPO = [0.22, 1, 0.36, 1] as const;
export const EASE_SWAP = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  micro: 0.15,
  swap: 0.4,
  morph: 0.7,
  dwell: 6500,
} as const;

/** Standard staggered entrance. Delay by index * 0.08s for tight rows. */
export function riseIn(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: EASE_EXPO, delay },
  };
}

/** Horizontal variant for left/right columns. */
export function slideIn(from: "left" | "right" = "left", delay = 0) {
  return {
    initial: { opacity: 0, x: from === "left" ? -28 : 28 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: EASE_EXPO, delay },
  };
}

/**
 * Viewport-triggered entrance. Use for anything below the fold.
 * `once` because these are scroll-narrative sections, not replays.
 */
export function useReveal<T extends HTMLElement>(margin: InViewMargin = "-100px") {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, margin });
  return { ref, inView } as const;
}

/** Staggered children helper — pairs with motion.div variants. */
export const staggerContainer = (stagger = 0.08, delay = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_EXPO },
  },
};
