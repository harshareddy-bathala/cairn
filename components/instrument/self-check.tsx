"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Panel } from "./panel";
import { Markdown } from "./markdown";
import { ease, DUR } from "@/lib/motion";
import type { RecallCard } from "@/db/schema";

/**
 * The same recall cards the deck is seeded from, offered once here — before you
 * tick the unit done.
 *
 * This is the honesty check on the tick. "Done" currently means "I read it",
 * and the gap between reading and knowing is exactly what this app is trying to
 * survive ninety days of. Answering three questions cold takes two minutes and
 * changes what the tick means.
 *
 * Nothing is recorded. Scoring it would turn it into an assessment, and an
 * assessment attached to marking a unit done is a reason not to mark units
 * done. The card comes back through the deck regardless.
 */
export function SelfCheck({ cards }: { cards: RecallCard[] }) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  const reduce = useReducedMotion();

  const allShown = shown.size === cards.length;

  return (
    <Panel
      legend="self-check"
      aux={allShown ? "all shown" : `${cards.length} question${cards.length === 1 ? "" : "s"}`}
    >
      <p className="mb-3.5 text-2xs leading-relaxed text-lo">
        Answer each one out loud before revealing it. Struggling here is the point — it is
        the retrieval that makes the material stick, not the reading.{" "}
        {!allShown && (
          <button
            type="button"
            onClick={() => setShown(new Set(cards.map((_, i) => i)))}
            className="tap text-mid underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-hi"
          >
            reveal all
          </button>
        )}
      </p>

      <ol className="space-y-3.5">
        {cards.map((c, i) => {
          const open = shown.has(i);
          return (
            <li key={i} className="border-l-2 border-line-soft pl-3">
              <Markdown source={c.front} className="text-base text-hi" />
              {open ? (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={ease(DUR.base)}
                >
                  <Markdown source={c.back} className="mt-1.5 text-base" />
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShown((s) => new Set(s).add(i))}
                  className="tap legend mt-1.5 transition-colors duration-[120ms] hover:text-mid"
                >
                  reveal ›
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-line-soft pt-3 text-2xs leading-relaxed text-lo">
        Marking this unit done adds these to your{" "}
        <span className="text-mid">review deck</span>, spaced by active day.
      </p>
    </Panel>
  );
}
