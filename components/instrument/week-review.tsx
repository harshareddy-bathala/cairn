"use client";

import { useState, useTransition } from "react";
import { WEEK_REVIEW_PROMPTS } from "@/content/review";
import type { WeekReview } from "@/lib/week-review";
import { submitWeekReview } from "@/app/actions/review";
import { cn } from "@/lib/cn";

const field =
  "w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-2 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none";

/**
 * Four questions and three priorities, once every seven active days.
 *
 * The priorities are the output. Everything above them is the reasoning that
 * makes them honest — a week's priorities written without first naming what you
 * could not explain are just the same three things you meant to do last week.
 */
export function WeekReviewForm({
  journeyWeek,
  existing,
  dayOfWeek,
}: {
  journeyWeek: number;
  existing: WeekReview | null;
  dayOfWeek: number;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(existing?.answers ?? {});
  const [priorities, setPriorities] = useState<string[]>(() => {
    const p = existing?.threePriorities ?? [];
    return [p[0] ?? "", p[1] ?? "", p[2] ?? ""];
  });
  const [saved, setSaved] = useState(Boolean(existing));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      try {
        await submitWeekReview({
          journeyWeek,
          answers,
          threePriorities: priorities,
        });
        setSaved(true);
        setDirty(false);
      } catch {
        setError("Could not save. Your answers are still here — try again.");
      }
    });
  }

  const answered = WEEK_REVIEW_PROMPTS.filter((p) => (answers[p.id] ?? "").trim()).length;

  return (
    <div className="space-y-4">
      <p className="text-2xs leading-relaxed text-lo">
        {saved && !dirty ? (
          <>
            Reviewed on active day {dayOfWeek} of this journey week. Edit any answer to
            revise it.
          </>
        ) : (
          <>
            Seven active days, not a calendar week — so this arrives when you have done the
            work. Answer what you can; a short honest review beats a complete invented one.
          </>
        )}
      </p>

      <div className="space-y-3.5">
        {WEEK_REVIEW_PROMPTS.map((p) => (
          <div key={p.id}>
            <label htmlFor={`wr-${p.id}`} className="block text-sm text-hi">
              {p.label}
            </label>
            <p className="mb-1.5 mt-0.5 text-2xs leading-relaxed text-lo">{p.help}</p>
            <textarea
              id={`wr-${p.id}`}
              rows={2}
              value={answers[p.id] ?? ""}
              onChange={(e) => {
                setAnswers((a) => ({ ...a, [p.id]: e.target.value }));
                setDirty(true);
              }}
              className={cn(field, "resize-y")}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-line-soft pt-3.5">
        <p className="text-sm text-hi">Three priorities for next week</p>
        <p className="mb-2 mt-0.5 text-2xs leading-relaxed text-lo">
          Three, not five. A list you can hold in your head is a list you will act on.
        </p>
        <ol className="space-y-1.5">
          {priorities.map((v, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="legend w-3 shrink-0 tabular-nums">{i + 1}</span>
              <input
                value={v}
                aria-label={`priority ${i + 1}`}
                onChange={(e) => {
                  setPriorities((p) => p.map((x, j) => (j === i ? e.target.value : x)));
                  setDirty(true);
                }}
                className={field}
              />
            </li>
          ))}
        </ol>
      </div>

      {error && <p className="text-2xs text-bad">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || (saved && !dirty)}
          className="rounded-[3px] border border-line px-3 py-2 text-2xs uppercase tracking-[0.08em] text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos disabled:opacity-50 disabled:hover:border-line disabled:hover:text-mid"
        >
          {pending ? "saving…" : saved && !dirty ? "saved" : saved ? "revise" : "record review"}
        </button>
        <span className="legend tabular-nums">
          {answered}/{WEEK_REVIEW_PROMPTS.length} answered
        </span>
      </div>
    </div>
  );
}

/** past weeks, collapsed — the priorities are what you come back to read */
export function PastReviews({ reviews }: { reviews: WeekReview[] }) {
  return (
    <ul className="space-y-2.5">
      {reviews.map((r) => (
        <li key={r.journeyWeek}>
          <details className="group">
            <summary className="tap flex cursor-pointer items-baseline gap-2 text-sm text-mid transition-colors duration-[120ms] hover:text-hi">
              <span className="legend shrink-0 tabular-nums">wk {r.journeyWeek}</span>
              <span className="min-w-0 flex-1 truncate text-2xs text-lo">
                {r.threePriorities.length
                  ? r.threePriorities.join(" · ")
                  : "no priorities recorded"}
              </span>
              <span className="shrink-0 text-lo transition-transform duration-[120ms] group-open:rotate-90">
                ›
              </span>
            </summary>
            <dl className="mt-2 space-y-2 border-l border-line-soft pl-3">
              {WEEK_REVIEW_PROMPTS.filter((p) => r.answers[p.id]).map((p) => (
                <div key={p.id}>
                  <dt className="legend">{p.label}</dt>
                  <dd className="prose-cairn mt-0.5 text-base">{r.answers[p.id]}</dd>
                </div>
              ))}
            </dl>
          </details>
        </li>
      ))}
    </ul>
  );
}
