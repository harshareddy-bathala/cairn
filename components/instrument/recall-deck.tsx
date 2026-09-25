"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cardFace, ease, DUR } from "@/lib/motion";
import { GRADES, type Grade } from "@/content/review";
import type { DueCard } from "@/lib/recall";
import { gradeCard, buryCard } from "@/app/actions/review";
import { Markdown } from "./markdown";
import { cn } from "@/lib/cn";
import { buttonClass } from "./button";

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
  const [lost, setLost] = useState(false);
  const [, start] = useTransition();
  const reduce = useReducedMotion();

  const card = queue[0];

  // Every step of a card removes the control you just used: "show answer"
  // unmounts when it flips, the grade buttons when you grade. Left alone, focus
  // falls to <body> and a keyboard user starts from the top of the page each
  // card. Instead it follows the work — to the answer once flipped, to the
  // next card's "show answer" once graded — but only when it was in the deck
  // (or already lost), never pulled away from something else on the page.
  const deck = useRef<HTMLDivElement>(null);
  const follow = useRef<"answer" | "next" | null>(null);
  const aim = (to: "answer" | "next") => {
    const a = document.activeElement;
    if (!a || a === document.body || deck.current?.contains(a)) follow.current = to;
  };
  const land = (to: "answer" | "next") => (el: HTMLElement | null) => {
    if (el && follow.current === to) {
      follow.current = null;
      el.focus({ preventScroll: true });
    }
  };

  /**
   * Grading advances at once and saves behind you. If the save fails, the card
   * comes back to the front of the queue and says so — the old version dropped
   * the error, so a flaky connection quietly un-reviewed a whole sitting.
   */
  const settle = useCallback((c: DueCard, write: () => Promise<unknown>, counted: boolean) => {
    start(async () => {
      const saved = await write().then(
        () => true,
        () => false,
      );
      if (saved) return;
      setLost(true);
      setQueue((q) => [c, ...q.filter((x) => x.id !== c.id)]);
      if (counted) setDone((n) => Math.max(0, n - 1));
    });
  }, []);

  const advance = useCallback(
    (grade: Grade) => {
      if (!card) return;
      aim("next");
      setLost(false);
      setFlipped(false);
      setDone((n) => n + 1);
      if (grade === "again") setAgain((n) => n + 1);
      // A card graded "again" is due on the next active day, not later today —
      // showing it again in this sitting would test the last ten seconds of
      // short-term memory rather than recall.
      setQueue((q) => q.slice(1));
      settle(card, () => gradeCard(card.id, grade), true);
    },
    [card, settle],
  );

  const bury = useCallback(() => {
    if (!card) return;
    aim("next");
    setLost(false);
    setFlipped(false);
    setQueue((q) => q.slice(1));
    settle(card, () => buryCard(card.id), false);
  }, [card, settle]);

  // Keyboard is the point of a deck. Space to flip, 1-4 to grade — the same
  // keys every spaced-repetition tool uses, so the muscle memory transfers.
  //
  // But only for keys aimed at the deck. The handler used to own Space and
  // Enter for the whole page, so a focused link, button or the week-review
  // textarea below could not be activated or typed into.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const onPage = !el || el === document.body;
      if (!onPage && !el.closest("[data-deck]")) return;
      if (el && (el.isContentEditable || el.closest("input, textarea, select"))) return;
      // a focused control keeps its own Space and Enter; digits still grade
      const control = !!el?.closest("button, a, summary");

      if (e.key === " " || e.key === "Enter") {
        if (control) return;
        e.preventDefault();
        aim("answer");
        setFlipped(true);
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
        <p ref={land("next")} tabIndex={-1} className="text-sm text-phos focus:outline-none">
          Deck clear.
        </p>
        <p className="mt-1.5 note text-lo">
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
    <div ref={deck} data-deck className="space-y-3">
      {lost && (
        <p role="alert" className="note text-bad">
          The last card did not save — it is back at the front. Check the connection and
          grade it again.
        </p>
      )}
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
            variants={cardFace}
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
                ref={land("answer")}
                tabIndex={-1}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={ease(DUR.base)}
                className="mt-3.5 border-t border-line-soft pt-3.5 focus:outline-none"
              >
                <span className="sr-only">Answer: </span>
                <Markdown source={card.back} className="text-base" />
              </motion.div>
            ) : (
              <button
                ref={land("next")}
                type="button"
                onClick={() => {
                  aim("answer");
                  setFlipped(true);
                }}
                className={buttonClass("ghost", "sm", "mt-4 w-full py-3 uppercase tracking-[0.08em] sm:py-2")}
              >
                show answer <span className="hidden text-lo sm:inline">· space</span>
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && (
        <motion.div
          initial={{ opacity: 0 }}
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
                "rounded-[3px] border px-2 py-3 text-xs transition-colors duration-[120ms] sm:py-2",
                g.grade === "again"
                  ? "border-line text-mid hover:border-bad hover:text-bad"
                  : g.grade === "easy"
                    ? "border-line text-mid hover:border-phos hover:text-phos"
                    : "border-line text-mid hover:border-phos-dim hover:text-phos-dim",
              )}
            >
              {g.label} <span className="hidden text-lo sm:inline">{g.key}</span>
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
