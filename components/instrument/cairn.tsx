"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { stoneDrop } from "@/lib/motion";

export type Stone = {
  dayIndex: number;
  mode: "normal" | "catchup" | "bad_day";
};

/**
 * Deterministic per-day width, so the stack looks like real stones rather than
 * a bar chart.
 *
 * Rounded to two decimals on purpose. The raw value is a full-precision float,
 * and React serialises it as `64.17429043556331%` on the server while motion
 * writes back `64.1743%` on the client — a hydration mismatch logged on every
 * page that shows the cairn, which is every page. Two decimals is well under a
 * pixel at this size and both sides agree on the string.
 */
function widthFor(dayIndex: number) {
  const n = Math.sin(dayIndex * 12.9898) * 43758.5453;
  const pct = 62 + (n - Math.floor(n)) * 38; // 62%..100%
  return `${pct.toFixed(2)}%`;
}

const MODE_CLASS = {
  normal: "bg-phos-dim",
  catchup: "bg-phos",
  bad_day: "bg-ink-700",
} as const;

/**
 * The streak, as a stack of stones — one per active day, banded every 7
 * (a journey week). This is the product's core metaphor and the payoff for
 * closing the day.
 */
export function Cairn({
  stones,
  max = 21,
  className,
  animateLast = false,
}: {
  stones: Stone[];
  max?: number;
  className?: string;
  animateLast?: boolean;
}) {
  const shown = stones.slice(-max);

  return (
    <div
      className={cn("flex w-full flex-col-reverse items-center gap-[3px]", className)}
      aria-label={`${stones.length} active days`}
    >
      {shown.map((s, i) => {
        const isLast = i === shown.length - 1;
        const bandEnd = s.dayIndex % 7 === 0;
        return (
          <motion.span
            key={s.dayIndex}
            variants={animateLast && isLast ? stoneDrop : undefined}
            initial={animateLast && isLast ? "hidden" : false}
            animate={animateLast && isLast ? "shown" : undefined}
            title={`day ${s.dayIndex}`}
            className={cn(
              "h-[3px] rounded-[1px]",
              MODE_CLASS[s.mode],
              bandEnd && "mb-[3px]",
              isLast && "shadow-[0_0_8px_-1px_var(--color-phos)]",
            )}
            style={{ width: widthFor(s.dayIndex) }}
          />
        );
      })}
    </div>
  );
}
