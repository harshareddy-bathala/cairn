"use client";

import { MotionConfig } from "motion/react";

/**
 * Motion follows the operating system's reduce-motion setting, everywhere.
 *
 * Under this, every motion component drops transform and layout animation by
 * itself when the setting is on; opacity changes, which carry meaning and do
 * not trigger vestibular symptoms, are kept. Components used to ask
 * `useReducedMotion()` each and pass `initial={reduce ? false : …}` — which
 * only some did, and which rendered one thing on the server (no preference
 * there) and another in the browser, a hydration mismatch on every page load
 * for anyone with the setting on. `initial` is now the same everywhere.
 *
 * The global CSS rule in globals.css does the same for CSS transitions.
 */
export function MotionPrefs({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
