"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PRIMARY_NAV, SECONDARY_NAV, activeHref } from "@/lib/nav";
import { scrim, sheet } from "@/lib/motion";
import { cn } from "@/lib/cn";

/**
 * The phone shell: one bottom tab bar, hidden at `sm` and up where the rail
 * takes over.
 *
 * It is at the bottom because that is where a thumb is, and it carries labels
 * because nine unlabelled glyphs is a memory test. Four fit with a readable
 * 11px label on a 390px screen; the other five live behind "more", which is
 * honest about them being the pages you visit weekly rather than hourly.
 *
 * There is deliberately no matching top bar. The obvious one would carry the
 * mark and the day index — but every page already opens with its own
 * `day 001 · week 01` line, and the Today tab is the way home. A second bar
 * would cost 44px of a 844px screen to repeat what is directly beneath it.
 * The cairn itself is not lost either: it lives in the day-close panel, which
 * is where dropping a stone actually happens.
 *
 * The bar pads itself against `env(safe-area-inset-bottom)`, so it clears the
 * home indicator on a notched phone rather than sitting under it.
 *
 * Layering, which the three z-indexes here depend on: the scrim (20) dims the
 * page, the tab bar (30) stays above it and usable, and the sheet (40) sits on
 * top of both.
 */
export function MobileNav() {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  // The sheet is route-scoped: navigating away must close it, or coming back
  // via the browser's back button lands you behind a menu you did not open.
  useEffect(() => setOpen(false), [pathname]);

  // While the sheet is up the page behind it must not scroll — otherwise a
  // thumb swipe on the scrim moves the page and the sheet appears stuck.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const moreActive = SECONDARY_NAV.some((n) => n.href === current);

  return (
    <>
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-900/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="flex">
          {PRIMARY_NAV.map((n) => (
            <li key={n.href} className="flex-1">
              <Tab
                href={n.href}
                glyph={n.glyph}
                label={n.label}
                active={current === n.href}
              />
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="menu"
              className={cn(
                "relative flex w-full flex-col items-center gap-[3px] px-1 py-2",
                "transition-colors duration-[120ms]",
                open || moreActive ? "text-phos" : "text-lo",
              )}
            >
              {(open || moreActive) && (
                <span className="absolute inset-x-3 top-0 h-[2px] rounded-b-[1px] bg-phos" />
              )}
              <span className="text-base leading-none">⋯</span>
              <span className="text-[10px] uppercase tracking-[0.06em] leading-none">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              variants={reduce ? undefined : scrim}
              initial="hidden"
              animate="shown"
              exit="exit"
              className="fixed inset-0 z-20 bg-ink-900/70 sm:hidden"
            />
            <motion.div
              role="menu"
              variants={reduce ? undefined : sheet}
              initial="hidden"
              animate="shown"
              exit="exit"
              /*
               * Seated directly on top of the tab bar rather than over it, so
               * the four primary tabs stay visible and tappable while the
               * sheet is up — including "More" itself, which is how you close
               * it without reaching for the scrim.
               */
              className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-y border-line bg-ink-850 sm:hidden"
            >
              <ul className="p-2">
                {SECONDARY_NAV.map((n) => (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      role="menuitem"
                      aria-current={current === n.href ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[3px] px-3 py-3 text-sm transition-colors duration-[120ms]",
                        current === n.href ? "bg-ink-800 text-phos" : "text-mid",
                      )}
                    >
                      <span className="w-4 text-center text-base leading-none" aria-hidden>
                        {n.glyph}
                      </span>
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Tab({
  href,
  glyph,
  label,
  active,
}: {
  href: string;
  glyph: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center gap-[3px] px-1 py-2 transition-colors duration-[120ms]",
        active ? "text-phos" : "text-lo",
      )}
    >
      {/* mirrors the rail's left marker, rotated to the edge the bar sits on */}
      {active && <span className="absolute inset-x-3 top-0 h-[2px] rounded-b-[1px] bg-phos" />}
      <span className="text-base leading-none" aria-hidden>
        {glyph}
      </span>
      <span className="text-[10px] uppercase tracking-[0.06em] leading-none">{label}</span>
    </Link>
  );
}
