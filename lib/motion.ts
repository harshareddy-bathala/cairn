/**
 * The entire motion budget. Nine named moments, nothing else animates.
 * Anything over 320ms needs a reason; only the certificate has one.
 */
import type { Transition, Variants } from "motion/react";

export const DUR = { fast: 0.12, base: 0.2, slow: 0.32, ceremony: 0.9 } as const;

/** out-expo-ish — the house easing */
export const EASE = [0.32, 0.72, 0, 1] as const;

export const ease = (duration: number = DUR.base): Transition => ({
  duration,
  ease: EASE,
});

/** physical objects only: stones landing, cards being tossed */
export const spring: Transition = { type: "spring", stiffness: 420, damping: 34 };

/** 1 — boot: panels power on, rows stagger 40ms. Once per session, <=450ms. */
export const boot: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

export const bootItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: ease(DUR.slow) },
};

/** 2 — a row completing */
export const rowComplete: Variants = {
  open: { opacity: 1 },
  done: { opacity: 0.55, transition: ease(DUR.base) },
};

/** 3 — a stone landing on the cairn. The signature moment. */
export const stoneDrop: Variants = {
  hidden: { opacity: 0, y: -14, scaleY: 0.8 },
  shown: { opacity: 1, y: 0, scaleY: 1, transition: spring },
};

/** 6 — the dither mask wiping off a hint: deliberate friction */
export const hintReveal: Variants = {
  masked: { clipPath: "inset(0 0 0 0)" },
  revealed: { clipPath: "inset(0 0 0 100%)", transition: { duration: 0.24, ease: EASE } },
};
