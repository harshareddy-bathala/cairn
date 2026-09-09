"use client";

import { useOptimistic, useTransition } from "react";
import { setBadDay, setCatchup } from "@/app/actions/day";
import { cn } from "@/lib/cn";

const STEPS = [1, 1.5, 2] as const;

/**
 * Pace and shape of the day.
 *
 * Catch-up is the answer to the thing that actually kills roadmaps: one missed
 * day becoming a two-week hole. At 2x the plan pulls the next unit in every
 * track, so a strong Saturday genuinely erases two skipped days rather than
 * leaving a debt you can never see the bottom of.
 *
 * Bad-day is the opposite move, and just as important — a day reduced to one
 * problem and the log still counts, so the streak is never a reason to lie.
 */
export function PaceControl({
  multiplier: initialMultiplier,
  badDay: initialBadDay,
  disabled = false,
}: {
  multiplier: number;
  badDay: boolean;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic(
    { multiplier: initialMultiplier, badDay: initialBadDay },
    (_s, next: { multiplier: number; badDay: boolean }) => next,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="catch-up pace"
        className={cn(
          "flex items-center rounded-[3px] border border-line",
          (state.badDay || disabled) && "opacity-40",
        )}
      >
        {STEPS.map((s) => {
          const active = !state.badDay && state.multiplier === s;
          return (
            <button
              key={s}
              type="button"
              disabled={state.badDay || disabled}
              aria-pressed={active}
              onClick={() =>
                startTransition(async () => {
                  setState({ multiplier: s, badDay: false });
                  await setCatchup(s);
                })
              }
              className={cn(
                "px-2.5 py-1 text-2xs tabular-nums transition-colors duration-[120ms]",
                "border-r border-line last:border-r-0",
                active ? "bg-ink-800 text-phos" : "text-lo hover:text-mid",
              )}
            >
              {s}×
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        aria-pressed={state.badDay}
        title="collapse today to one problem and the log — the streak survives"
        onClick={() =>
          startTransition(async () => {
            setState({ multiplier: 1, badDay: !state.badDay });
            await setBadDay(!state.badDay);
          })
        }
        className={cn(
          "rounded-[3px] border px-2.5 py-1 text-2xs transition-colors duration-[120ms]",
          state.badDay
            ? "border-info/60 bg-ink-800 text-info"
            : "border-line text-lo hover:border-line-hi hover:text-mid",
          disabled && "opacity-40",
        )}
      >
        bad day
      </button>
    </div>
  );
}
