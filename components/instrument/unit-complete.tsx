"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { setUnitState } from "@/app/actions/progress";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";
import { useAction } from "@/lib/use-action";
import { fmtDay } from "@/lib/format";

/**
 * Moment 2 — a unit completing: the glyph flips and a phosphor pulse runs the rule.
 *
 * Then it says where to go. Completing a unit used to be a dead end: the button
 * flipped and the page offered nothing, so the next step was a trip back
 * through the roadmap to find the unit after this one.
 */
export function UnitComplete({
  unitSlug,
  done: initial,
  completedOnDayIndex,
  next,
  moduleSlug,
}: {
  unitSlug: string;
  done: boolean;
  completedOnDayIndex?: number | null;
  /** the unit after this one in its module, or null when this is the last */
  next: { slug: string; title: string } | null;
  moduleSlug: string;
}) {
  const save = useAction(setUnitState);
  const [override, setOverride] = useState<boolean | null>(null);
  const done = override ?? initial;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="legend">
            {done
              ? `completed · ${fmtDay(completedOnDayIndex ?? 0)}`
              : "when the objective is genuinely met"}
          </p>
          {!done && (
            <p className="mt-1 note text-lo">
              Not when you have read it — when you could explain it to someone else.
            </p>
          )}
          {save.error && (
            <p role="alert" className="note mt-1 text-bad">
              {save.error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            setOverride(!done);
            const r = await save.run(unitSlug, !done);
            if (!r.ok) setOverride(null);
          }}
          disabled={save.pending}
          className={cn(
            "ctl relative shrink-0 overflow-hidden rounded-[3px] border px-4 py-2 text-sm transition-colors duration-[120ms]",
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

      {done && (
        <p className="border-t border-line-soft pt-3 text-sm">
          {next ? (
            <Link href={`/unit/${next.slug}`} className="tap text-hi hover:text-phos">
              <span className="legend mr-2">next</span>
              {next.title} →
            </Link>
          ) : (
            <Link href={`/checkpoint/${moduleSlug}`} className="tap text-hi hover:text-phos">
              <span className="legend mr-2">module done</span>
              take the checkpoint →
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
