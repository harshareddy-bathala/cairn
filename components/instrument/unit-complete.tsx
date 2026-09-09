"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "motion/react";
import { setUnitState } from "@/app/actions/progress";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

/** Moment 2 — a unit completing: the glyph flips and a phosphor pulse runs the rule. */
export function UnitComplete({
  unitSlug,
  done: initial,
  completedOnDayIndex,
}: {
  unitSlug: string;
  done: boolean;
  completedOnDayIndex?: number | null;
}) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(initial, (_s, next: boolean) => next);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="legend">
          {done
            ? `completed · day ${String(completedOnDayIndex ?? 0).padStart(3, "0")}`
            : "when the objective is genuinely met"}
        </p>
        {!done && (
          <p className="mt-1 text-2xs leading-relaxed text-lo">
            Not when you have read it — when you could explain it to someone else.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            setDone(!done);
            await setUnitState(unitSlug, !done);
          })
        }
        className={cn(
          "relative shrink-0 overflow-hidden rounded-[3px] border px-4 py-2 text-sm transition-colors duration-[120ms]",
          done
            ? "border-phos text-phos"
            : "border-line text-mid hover:border-phos-dim hover:text-hi",
        )}
      >
        {done && (
          <motion.span
            key="pulse"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: DUR.slow, ease: EASE }}
            className="pointer-events-none absolute inset-y-0 w-1/2 bg-phos/10"
          />
        )}
        <span className="relative">{done ? "✓ complete" : "mark complete"}</span>
      </button>
    </div>
  );
}
