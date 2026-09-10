"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cardFace, ease, DUR } from "@/lib/motion";
import { GRADES, type Grade } from "@/content/review";
import type { DueCard } from "@/lib/recall";
import { gradeCard, buryCard } from "@/app/actions/review";
import { Markdown } from "./markdown";
import { cn } from "@/lib/cn";

/**
 * The deck: one card at a time, answer hidden until you commit to having tried.
 *
 * The hidden answer is the whole mechanism. A card with its answer visible is
 * re-reading, which feels like studying and is not — the retrieval attempt is
 * what does the work, so the interface refuses to show the back until you have
 * made one.
 *
 * Grading optimistically advances to the next card and lets the write settle in
 * the background. At twenty cards a sitting, waiting ~90ms on each grade is
 * three seconds of staring at a card you have finished with.
 */
export function RecallDeck({ cards, dayIndex }: { cards: DueCard[]; dayIndex: number }) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [again, setAgain] = useState(0);
  const [, start] = useTransition();
  const reduce = useReducedMotion();

  const card = queue[0];

  const advance = useCallback(
    (grade: Grade) => {
      if (!card) return;
      const id = card.id;
      setFlipped(false);
      setDone((n) => n + 1);
      if (grade === "again") setAgain((n) => n + 1);
      // A card graded "again" is due on the next active day, not later today —
      // showing it again in this sitting would test the last ten seconds of
      // short-term memory rather than recall.
      setQueue((q) => q.slice(1));
      start(() => {
        void gradeCard(id, grade);
      });
    },
    [card],
  );

  const bury = useCallback(() => {
    if (!card) return;
    const id = card.id;
    setFlipped(false);
    setQueue((q) => q.slice(1));
    start(() => {
      void buryCard(id);
    });
  }, [card]);

  // Keyboard is the point of a deck. Space to flip, 1-4 to grade — the same
  // keys every spaced-repetition tool uses, so the muscle memory transfers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => f || true);
        return;
      }
      if (!flipped) return;
      const g = GRADES.find((x) => x.key === e.key);
      if (g) {
        e.preventDefault();
        advance(g.grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, advance]);

  if (!card) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-phos">Deck clear.</p>
        <p className="mt-1.5 text-2xs leading-relaxed text-lo">
          {done > 0 ? (
            <>
              {done} card{done === 1 ? "" : "s"} reviewed
              {again > 0 && <> · {again} coming back tomorrow</>}. Nothing else is due until
              your next active days.
            </>
          ) : (
            <>Nothing is due. Cards arrive as you finish units.</>
          )}
        </p>
      </div>
    );
  }

  const overdue = dayIndex - card.dueDayIndex;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="legend tabular-nums">
          {done + 1}/{done + queue.length}
        </span>
        <div className="h-[2px] flex-1 overflow-hidden rounded-[1px] bg-ink-800">
          <motion.span
            className="block h-full bg-phos-dim"
            initial={false}
            animate={{ width: `${(done / (done + queue.length)) * 100}%` }}
            transition={reduce ? { duration: 0 } : ease(DUR.base)}
          />
        </div>
        {card.lapses > 1 && (
          <span className="legend shrink-0 text-warn" title={`missed ${card.lapses} times before`}>
            lapsed ×{card.lapses}
          </span>
        )}
        {overdue > 0 && (
          <span className="legend shrink-0 tabular-nums" title="active days past due">
            +{overdue}d
          </span>
        )}
      </div>

      <div className="min-h-[9rem] rounded-[3px] border border-line-soft bg-ink-900/50 p-4 sm:min-h-[10rem] sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={card.id}
            variants={reduce ? undefined : cardFace}
            initial="enter"
            animate="shown"
            exit="exit"
          >
            {/* the fronts are authored with inline code spans — `reserve(n)`
                and friends — so they render as markdown, not as text with
                visible backticks */}
            <Markdown source={card.front} className="text-base text-hi" />

            {flipped ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={ease(DUR.base)}
                className="mt-3.5 border-t border-line-soft pt-3.5"
              >
                <Markdown source={card.back} className="text-base" />
              </motion.div>
            ) : (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="mt-4 w-full rounded-[3px] border border-line px-3 py-2.5 text-2xs uppercase tracking-[0.08em] text-mid transition-colors duration-[120ms] hover:border-phos-dim hover:text-phos sm:py-2"
              >
                show answer <span className="text-lo">· space</span>
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={ease(DUR.fast)}
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
        >
          {GRADES.map((g) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => advance(g.grade)}
              title={g.hint}
              className={cn(
                "rounded-[3px] border px-2 py-2.5 text-2xs transition-colors duration-[120ms] sm:py-2",
                g.grade === "again"
                  ? "border-line text-mid hover:border-bad hover:text-bad"
                  : g.grade === "easy"
                    ? "border-line text-mid hover:border-phos hover:text-phos"
                    : "border-line text-mid hover:border-phos-dim hover:text-phos-dim",
              )}
            >
              {g.label} <span className="text-lo">{g.key}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* one line, always: the unit link gives up width so `bury` stays put */}
      <div className="flex items-baseline gap-3">
        {card.unitSlug ? (
          <Link
            href={`/unit/${card.unitSlug}`}
            className="tap legend min-w-0 flex-1 truncate transition-colors duration-[120ms] hover:text-mid"
          >
            {card.moduleTitle ? `${card.moduleTitle} · ` : ""}
            {card.unitTitle}
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={bury}
          title="hide this card until next journey week"
          className="tap legend shrink-0 transition-colors duration-[120ms] hover:text-mid"
        >
          bury
        </button>
      </div>
    </div>
  );
}
