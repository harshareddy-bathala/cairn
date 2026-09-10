/**
 * The entire motion budget. Nine named moments, nothing else animates.
 *
 * The count is the point, not the list — a tenth moment means one of these
 * was not carrying its weight.
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

/**
 * 7 — a recall card being replaced.
 *
 * Deliberately not a flip. A 3D card flip is the obvious choice and the wrong
 * one: it is 400ms of ceremony repeated twenty times a sitting, and by the
 * fifth card it is friction. The card is *replaced*, quickly, and the answer
 * unfolds beneath the question rather than turning over — so the question
 * stays on screen next to its answer, which is the pairing you want to read.
 */
export const cardFace: Variants = {
  enter: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: ease(DUR.base) },
  exit: { opacity: 0, y: -6, transition: ease(DUR.fast) },
};

/** 8 — the mobile navigation sheet rising from the tab bar */
export const sheet: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: ease(DUR.base) },
  exit: { opacity: 0, y: 12, transition: ease(DUR.fast) },
};

/** 9 — the scrim behind it */
export const scrim: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: ease(DUR.fast) },
  exit: { opacity: 0, transition: ease(DUR.fast) },
};
