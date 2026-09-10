"use client";

import { useEffect, useState } from "react";
import { applyTheme, readTheme, THEMES, THEME_KEY, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/cn";

/**
 * The theme switch.
 *
 * Deliberately not persisted to the database. It is a property of the screen
 * you are looking at, not of you — the phone you read on a bus in daylight and
 * the desktop you work at in the evening should be allowed to disagree, and a
 * server-side preference would force them to match.
 *
 * The stored value is the *choice* ("system"), not the resolved theme, so a
 * device that switches at sunset keeps following it.
 */
export function ThemeControl() {
  // Server-rendered with the default, corrected on mount. This one place is
  // allowed the flash the rest of the app avoids: it is three buttons whose
  // selected state settles instantly, not the whole page's colour.
  const [choice, setChoice] = useState<ThemeChoice>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(readTheme());
    setReady(true);
  }, []);

  // A device that flips at sunset should carry a "match system" reader with it
  // without a reload.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  // Two tabs open, one changes the theme: the other should follow rather than
  // sit in a state the stored preference says it is not in.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_KEY) return;
      const next = readTheme();
      setChoice(next);
      applyTheme(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function pick(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next);
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="grid gap-1.5 sm:grid-cols-3"
        // until the stored choice is read, no option is truthfully selected
        aria-busy={!ready}
      >
        {THEMES.map((t) => {
          const active = ready && choice === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(t.value)}
              className={cn(
                "rounded-[3px] border px-3 py-2.5 text-left transition-colors duration-[120ms]",
                active
                  ? "border-phos-dim bg-ink-800 text-hi"
                  : "border-line text-mid hover:border-line-hi hover:text-hi",
              )}
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-[1px]",
                    active ? "bg-phos" : "bg-ink-700",
                  )}
                />
                {t.label}
              </span>
              <span className="mt-0.5 block text-2xs leading-relaxed text-lo">{t.note}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-2xs leading-relaxed text-lo">
        Stored on this device only, so your phone and your desk can differ. Phosphor stays
        reserved for state in both — it is a different green in daylight because the dark
        one is unreadable on paper, not because the rule changed.
      </p>
    </div>
  );
}
