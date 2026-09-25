"use client";

import { useState } from "react";
import { setBadDay, setCatchup } from "@/app/actions/day";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/use-action";

const STEPS = [1, 1.5, 2] as const;

/**
 * What each setting does to today, said under the control rather than in a
 * tooltip. A hover title never reaches a phone, and these are the two buttons
 * whose effect is least obvious from their labels.
 */
function caption(multiplier: number, badDay: boolean) {
  if (badDay) return "Bad day: one problem and the log. The streak survives.";
  if (multiplier >= 2) return "2×: the next unit in every lane is pulled forward.";
  if (multiplier >= 1.5) return "1.5×: one extra DSA unit is pulled forward.";
  return "1×: the normal day. Raise it to catch up after a missed day.";
}

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
  multiplier,
  badDay,
  disabled = false,
}: {
  multiplier: number;
  badDay: boolean;
  disabled?: boolean;
}) {
  const catchup = useAction(setCatchup);
  const bad = useAction(setBadDay);
  // the choice shows at once; the server's answer (a new plan) replaces it,
  // and a failure falls back to what the server still says
  const [pending, setPending] = useState<{ multiplier: number; badDay: boolean } | null>(null);
  const state = pending ?? { multiplier, badDay };
  const busy = catchup.pending || bad.pending;
  const error = catchup.error ?? bad.error;

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
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
                disabled={state.badDay || disabled || busy}
                aria-pressed={active}
                onClick={async () => {
                  setPending({ multiplier: s, badDay: false });
                  await catchup.run(s);
                  setPending(null);
                }}
                className={cn(
                  "disabled:cursor-not-allowed",
                  // 36px tall on a phone, where this is a thumb target; 28px at `sm`
                  "h-9 min-w-11 px-2.5 text-xs tabular-nums transition-colors duration-[120ms] sm:h-7 sm:min-w-0 sm:text-2xs",
                  "border-r border-line last:border-r-0",
                  active ? "bg-ink-800 text-phos" : "text-mid hover:text-hi",
                )}
              >
                {s}×
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={disabled || busy}
          aria-pressed={state.badDay}
          onClick={async () => {
            const next = !state.badDay;
            setPending({ multiplier: 1, badDay: next });
            await bad.run(next);
            setPending(null);
          }}
          className={cn(
            "h-9 rounded-[3px] border px-3 text-xs transition-colors duration-[120ms] sm:h-7 sm:px-2.5 sm:text-2xs",
            state.badDay
              ? "border-info/60 bg-ink-800 text-info"
              : "border-line text-mid hover:border-lo hover:text-hi",
            disabled && "opacity-40",
          )}
        >
          bad day
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-2xs text-bad">
          {error}
        </p>
      ) : (
        !disabled && <p className="text-2xs text-lo">{caption(state.multiplier, state.badDay)}</p>
      )}
    </div>
  );
}
