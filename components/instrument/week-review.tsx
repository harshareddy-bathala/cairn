"use client";

import { useState } from "react";
import { WEEK_REVIEW_PROMPTS } from "@/content/review";
import type { DayEntry, WeekReview } from "@/lib/week-review";
import { submitWeekReview } from "@/app/actions/review";
import { fmtDay, fmtMin } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { Button } from "./button";
import { Input, Textarea } from "./field";

/**
 * Four questions and three priorities, once every seven active days.
 *
 * The priorities are the output. Everything above them is the reasoning that
 * makes them honest — a week's priorities written without first naming what you
 * could not explain are just the same three things you meant to do last week.
 */
export function WeekReviewForm({
  existing,
  dayOfWeek,
  entries,
}: {
  /** display only — the server files the review against the week you are in */
  journeyWeek: number;
  existing: WeekReview | null;
  dayOfWeek: number;
  /** the week's closed days, read back before the questions */
  entries: DayEntry[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(existing?.answers ?? {});
  const [priorities, setPriorities] = useState<string[]>(() => {
    const p = existing?.threePriorities ?? [];
    return [p[0] ?? "", p[1] ?? "", p[2] ?? ""];
  });
  const [saved, setSaved] = useState(Boolean(existing));
  const [dirty, setDirty] = useState(false);
  const save = useAction(submitWeekReview);
  const pending = save.pending;
  const error = save.error && `Could not save. Your answers are still here. ${save.error}`;

  async function submit() {
    const r = await save.run({ answers, threePriorities: priorities });
    if (r.ok) {
      setSaved(true);
      setDirty(false);
    }
  }

  const answered = WEEK_REVIEW_PROMPTS.filter((p) => (answers[p.id] ?? "").trim()).length;

  return (
    <div className="space-y-4">
      <p className="note text-lo">
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

      {/*
        The week's own words, before the questions. Answering "what could you
        not explain?" from memory of a week is guessing; from its seven entries
        it is reading.
      */}
      {entries.length > 0 && (
        <div>
          <p className="legend mb-1.5">this week, as you logged it</p>
          <ol className="divide-y divide-line-soft border-y border-line-soft">
            {entries.map((e) => (
              <li key={e.dayIndex} className="flex gap-3 py-1.5">
                <span className="legend w-12 shrink-0 tabular-nums">{fmtDay(e.dayIndex, true)}</span>
                <span className="min-w-0 flex-1 text-sm text-mid">
                  {e.learned || <span className="text-lo">nothing written</span>}
                  {e.mode === "bad_day" && <span className="legend ml-2 text-info">bad day</span>}
                </span>
                <span className="legend shrink-0 tabular-nums">{e.minutes ? fmtMin(e.minutes) : "—"}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-3.5">
        {WEEK_REVIEW_PROMPTS.map((p) => (
          <div key={p.id}>
            <label htmlFor={`wr-${p.id}`} className="block text-sm text-hi">
              {p.label}
            </label>
            <p className="mb-1.5 mt-0.5 note text-lo">{p.help}</p>
            <Textarea
              id={`wr-${p.id}`}
              rows={2}
              value={answers[p.id] ?? ""}
              onChange={(e) => {
                setAnswers((a) => ({ ...a, [p.id]: e.target.value }));
                setDirty(true);
              }}
              className="resize-y py-2"
            />
          </div>
        ))}
      </div>

      <div className="border-t border-line-soft pt-3.5">
        <p className="text-sm text-hi">Three priorities for next week</p>
        <p className="mb-2 mt-0.5 note text-lo">
          Three, not five. A list you can hold in your head is a list you will act on.
        </p>
        <ol className="space-y-1.5">
          {priorities.map((v, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="legend w-3 shrink-0 tabular-nums">{i + 1}</span>
              <Input
                value={v}
                aria-label={`priority ${i + 1}`}
                onChange={(e) => {
                  setPriorities((p) => p.map((x, j) => (j === i ? e.target.value : x)));
                  setDirty(true);
                }}
                className="py-2"
              />
            </li>
          ))}
        </ol>
      </div>

      {error && <p role="alert" className="note text-bad">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={submit}
          pending={pending}
          disabled={saved && !dirty}
          className="py-2 uppercase tracking-[0.08em]"
        >
          {pending ? "saving…" : saved && !dirty ? "saved" : saved ? "revise" : "record review"}
        </Button>
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
