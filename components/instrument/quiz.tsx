"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Question } from "@/content/checkpoints";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

export type QuizQuestion = Omit<Question, "answer" | "why"> & {
  /** withheld until the paper is submitted — the client never holds the key */
  answer?: number;
  why?: string;
};

export type QuizResult = {
  score: number;
  total: number;
  passed: boolean;
  /** question id -> correct index, returned only after submission */
  key: Record<string, number>;
  why: Record<string, string>;
};

/**
 * One paper, all questions on screen.
 *
 * The correct answers are not in the page until you submit — otherwise the
 * checkpoint measures your willingness to open devtools. Afterwards every
 * question shows its explanation, right or wrong, because the checkpoint is
 * meant to teach as much as to gate.
 */
export function Quiz({
  questions,
  onSubmit,
  timeLimitMin,
  submitLabel = "submit",
}: {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, number>) => Promise<QuizResult>;
  timeLimitMin?: number;
  submitLabel?: string;
}) {
  const reduce = useReducedMotion();
  const [, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [left, setLeft] = useState(timeLimitMin ? timeLimitMin * 60 : null);
  const submitted = useRef(false);

  const answeredCount = Object.keys(answers).length;

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    startTransition(async () => {
      const r = await onSubmit(answers);
      setResult(r);
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  };

  useEffect(() => {
    if (left == null || result) return;
    if (left <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setLeft((n) => (n == null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, result]);

  return (
    <div className="space-y-5">
      {result ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.slow, ease: EASE }}
          className="flex items-baseline justify-between gap-4 border-b border-line pb-3"
        >
          <span className={cn("text-2xl tabular-nums", result.passed ? "text-phos" : "text-warn")}>
            {result.score}
            <span className="text-lo">/{result.total}</span>
          </span>
          <span className="text-2xs leading-relaxed text-lo">
            {result.passed
              ? "Passed. Read the explanations on anything you guessed — a lucky guess is still a gap."
              : "Not passed. Nothing is locked; the explanations below are the point, and you can retake it."}
          </span>
        </motion.div>
      ) : (
        <div className="flex items-baseline justify-between gap-4">
          <span className="legend tabular-nums">
            {answeredCount}/{questions.length} answered
          </span>
          {left != null && (
            <span
              className={cn(
                "text-sm tabular-nums",
                left < 60 ? "text-bad" : left < 300 ? "text-warn" : "text-mid",
              )}
            >
              {String(Math.floor(left / 60)).padStart(2, "0")}:
              {String(left % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const chosen = answers[q.id];
          const key = result?.key[q.id];
          return (
            <li key={q.id} className="space-y-2">
              <p className="flex gap-3 text-sm leading-relaxed text-hi">
                <span className="legend shrink-0 pt-1 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="prose-cairn">{q.prompt}</span>
              </p>
              <ul className="space-y-1 pl-9">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isKey = key === oi;
                  const wrongChoice = result != null && isChosen && !isKey;
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        disabled={result != null}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        className={cn(
                          "flex w-full items-baseline gap-2.5 rounded-[3px] border px-2.5 py-1.5 text-left text-sm transition-colors duration-[120ms]",
                          result == null && isChosen && "border-phos-dim text-hi",
                          result == null && !isChosen && "border-line text-mid hover:border-line-hi hover:text-hi",
                          isKey && "border-phos text-phos",
                          wrongChoice && "border-bad text-bad",
                          result != null && !isKey && !wrongChoice && "border-line-soft text-lo",
                        )}
                      >
                        <span className="legend shrink-0">
                          {result != null && isKey ? "✓" : wrongChoice ? "✕" : String.fromCharCode(97 + oi)}
                        </span>
                        <span className="prose-cairn">{opt}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {result?.why[q.id] && (
                <motion.p
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: DUR.base, ease: EASE }}
                  className="prose-cairn ml-9 border-l border-line-soft pl-3 text-sm leading-relaxed text-mid"
                >
                  {result.why[q.id]}
                </motion.p>
              )}
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={submit}
            className="rounded-[3px] border border-line px-4 py-1.5 text-sm text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos"
          >
            {submitLabel}
          </button>
          {answeredCount < questions.length && (
            <span className="text-2xs text-lo">
              {questions.length - answeredCount} unanswered — those count as wrong.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
