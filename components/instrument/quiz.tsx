"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { PaperQuestion } from "@/lib/quiz-paper";
import type { QuizGrade } from "@/lib/quiz-sessions";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";
import { Button } from "./button";

/**
 * The focus ring an option shows while its (visually hidden) radio has focus.
 * The radio does the work — arrow keys between options, one choice per group,
 * "2 of 4" read aloud — and the label it sits in is what you see.
 */
const optionFocus =
  "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-phos has-[input:focus-visible]:outline-solid";

export type QuizQuestion = PaperQuestion;
export type QuizResult = QuizGrade;

/**
 * One paper, all questions on screen.
 *
 * The correct answers are not in the page until a pass — otherwise the
 * checkpoint measures your willingness to open devtools, and a failed paper
 * that hands back its key turns the retake into transcription. A pass shows
 * every explanation; a failed checkpoint marks which answers were wrong (their
 * explanations wait on Review, from the next day); a failed exam shows where
 * the marks went, module by module.
 */
export function Quiz({
  questions,
  onSubmit,
  onRetake,
  retakeLabel = "sit a fresh paper",
  deadlineAt,
  serverNow,
  submitLabel = "submit",
  afterPass,
}: {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, number>) => Promise<QuizResult | { ok: false; error: string }>;
  /** offered once graded, or when the paper is spent; without it the result is the end */
  onRetake?: () => void;
  retakeLabel?: string;
  /** epoch ms, from the server; omitted for an untimed paper */
  deadlineAt?: number | null;
  /** the server's clock when the paper was drawn, to correct for this tab's */
  serverNow?: number;
  submitLabel?: string;
  /** where to go once passed — shown under the score, so a pass is not a dead end */
  afterPass?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  // The clock is the server's deadline, not a countdown this tab keeps: a
  // countdown restarts on reload and stops when the tab sleeps. The skew
  // corrects for a device clock that is simply wrong.
  const skew = useRef(serverNow != null ? serverNow - Date.now() : 0);
  const remaining = () =>
    deadlineAt == null
      ? null
      : Math.max(0, Math.ceil((deadlineAt - (Date.now() + skew.current)) / 1000));
  const [left, setLeft] = useState(remaining);

  const answeredCount = Object.keys(answers).length;

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    setError(null);
    startTransition(async () => {
      // A failed submission must leave the answers on screen and the button
      // live. Before, a dropped request left `submitted` latched forever and
      // took the page down with it — twenty answers, gone.
      const r = await onSubmit(answers).catch(() => ({
        ok: false as const,
        error: "Could not reach the server. Your answers are still here — submit again.",
      }));
      if (!r.ok) {
        submitted.current = false;
        setError(r.error);
        return;
      }
      setResult(r);
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  };

  useEffect(() => {
    if (deadlineAt == null || result) return;
    const t = setInterval(() => setLeft(remaining()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineAt, result]);

  useEffect(() => {
    if (left === 0 && !result && !submitted.current && !error) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const wrong = new Set(result?.wrong ?? []);

  return (
    <div className="space-y-5">
      {result ? (
        <motion.div
          // Grading removes the submit button, and focus would drop to <body>
          // with it. It lands on the score instead — the thing that just changed.
          ref={(el) => el?.focus({ preventScroll: true })}
          tabIndex={-1}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.slow, ease: EASE }}
          className="space-y-3 border-b border-line pb-3 focus:outline-none"
        >
          <div className="flex items-baseline justify-between gap-4">
            <span className={cn("text-2xl tabular-nums", result.passed ? "text-phos" : "text-warn")}>
              <span className="sr-only">{result.passed ? "Passed: " : "Not passed: "}</span>
              {result.score}
              <span className="text-lo">/{result.total}</span>
            </span>
            <span className="note text-lo">
              {result.passed
                ? "Passed. Read the explanations on anything you guessed — a lucky guess is still a gap."
                : result.wrong
                  ? "Not passed. The ones marked ✕ were wrong; their explanations open on Review from tomorrow. A retake is a fresh paper, in a new order."
                  : "Not passed. The breakdown shows where the marks went; a retake draws a new paper."}
              {onRetake && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onRetake}
                    className="tap text-info underline underline-offset-[3px] hover:text-hi"
                  >
                    {retakeLabel}
                  </button>
                </>
              )}
            </span>
          </div>
          {result.passed && afterPass}
          {result.byModule && (
            <ul className="divide-y divide-line-soft border-t border-line-soft">
              {result.byModule.map((m) => (
                <li key={m.title} className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                  <span className="text-mid">{m.title}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      m.score === m.total ? "text-phos-dim" : m.score === 0 ? "text-bad" : "text-warn",
                    )}
                  >
                    {m.score}/{m.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      ) : (
        // sticky, so the count and the clock stay in view down a twenty-question
        // paper instead of scrolling away with the first question
        <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between gap-4 border-b border-line-soft bg-ink-850 px-4 py-2.5">
          <span className="legend tabular-nums" aria-live="polite">
            {answeredCount}/{questions.length} answered
          </span>
          {left != null && (
            <span
              role="timer"
              aria-label={`${Math.ceil(left / 60)} minutes left`}
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
          const key = result?.key?.[q.id];
          const markedWrong = wrong.has(q.id);
          return (
            <li key={q.id}>
              {/* A question is a radio group: the prompt is its legend, so a
                  screen reader announces it on entering the options, and the
                  arrow keys move between answers the way they do in any form. */}
              <fieldset className="space-y-2" disabled={result != null}>
                <legend className="w-full text-sm leading-relaxed text-hi">
                  <span className="flex gap-3">
                    <span className="legend shrink-0 pt-1 tabular-nums">
                      {result?.wrong ? (
                        <span className={markedWrong ? "text-bad" : "text-phos-dim"}>
                          <span aria-hidden>{markedWrong ? "✕" : "✓"}</span>
                          <span className="sr-only">{markedWrong ? "wrong: " : "right: "}</span>
                        </span>
                      ) : (
                        <span aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                      )}
                    </span>
                    <span className="prose-cairn">{q.prompt}</span>
                  </span>
                </legend>
                <div className="space-y-1 pl-9">
                  {q.options.map((opt, oi) => {
                    const isChosen = chosen === oi;
                    const isKey = key === oi;
                    const wrongChoice = key != null && isChosen && !isKey;
                    return (
                      <label
                        key={oi}
                        className={cn(
                          "flex w-full items-baseline gap-2.5 rounded-[3px] border px-3 py-2 text-left text-sm transition-colors duration-[120ms]",
                          optionFocus,
                          result == null && "cursor-pointer",
                          result == null && isChosen && "border-phos-dim bg-ink-800 text-hi",
                          result == null && !isChosen && "border-line text-mid hover:border-phos-dim hover:text-hi",
                          isKey && "border-phos text-phos",
                          wrongChoice && "border-bad text-bad",
                          // no key on a failed paper: your choice stays visible, uncoloured
                          result != null && key == null && isChosen && "border-phos-dim text-mid",
                          result != null && !isKey && !wrongChoice && !(key == null && isChosen) &&
                            "border-line-soft text-lo",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={oi}
                          checked={isChosen}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                          className="sr-only"
                        />
                        <span className="legend shrink-0" aria-hidden>
                          {isKey ? "✓" : wrongChoice ? "✕" : String.fromCharCode(97 + oi)}
                        </span>
                        <span className="prose-cairn">{opt}</span>
                        {isKey && <span className="sr-only"> (correct answer)</span>}
                        {wrongChoice && <span className="sr-only"> (your answer, wrong)</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {result?.why?.[q.id] && (
                <motion.p
                  initial={{ opacity: 0 }}
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
          <Button variant="primary" size="md" onClick={submit} pending={pending} className="py-1.5">
            {pending ? "grading…" : submitLabel}
          </Button>
          {error && (
            <span role="alert" className="note w-full text-bad">
              {error}
              {onRetake && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onRetake}
                    className="tap text-info underline underline-offset-[3px] hover:text-hi"
                  >
                    {retakeLabel}
                  </button>
                </>
              )}
            </span>
          )}
          {answeredCount < questions.length && (
            <span className="note text-lo">
              {questions.length - answeredCount} unanswered — those count as wrong.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
