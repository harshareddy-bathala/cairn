"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Cairn, type Stone } from "./cairn";
import { closeDay, reopenDay } from "@/app/actions/day";
import { DUR, EASE } from "@/lib/motion";
import { useAction } from "@/lib/use-action";
import { fmtDay } from "@/lib/format";
import { Button } from "./button";
import { Field, Input, Textarea } from "./field";

/**
 * Closing the day.
 *
 * This is the accountability the roadmap never had, and it is deliberately the
 * only thing that advances day_index and the streak. It is also deliberately
 * short: two sentences and a number. A ritual you can complete at 11 PM is a
 * ritual you will actually complete.
 */
export function DayClose({
  dayIndex,
  stones,
  closed: initialClosed,
  learned: initialLearned,
  tomorrowFirstTask: initialTask,
  minutes: initialMinutes,
  suggestedMinutes,
}: {
  dayIndex: number;
  stones: Stone[];
  closed: boolean;
  learned?: string | null;
  tomorrowFirstTask?: string | null;
  minutes?: number;
  suggestedMinutes?: number;
}) {
  const reduce = useReducedMotion();
  const close = useAction(closeDay);
  const reopen = useAction(reopenDay);
  const [closed, setClosed] = useState(initialClosed);
  const [justClosed, setJustClosed] = useState(false);
  // Closing unmounts the form, and the button that had focus goes with it —
  // focus would fall back to <body> and a keyboard user would be at the top of
  // the page. It moves to the line that says what just happened instead, and
  // back to the first field on a reopen.
  const [justReopened, setJustReopened] = useState(false);
  const [learned, setLearned] = useState(initialLearned ?? "");
  const [task, setTask] = useState(initialTask ?? "");
  const [minutes, setMinutes] = useState(
    String(initialMinutes || suggestedMinutes || ""),
  );

  const shown: Stone[] = closed
    ? stones
    : [...stones, { dayIndex, mode: "normal" as const }];

  if (closed) {
    return (
      <div className="flex items-center gap-6">
        <div className="w-16 shrink-0">
          {/* Moment 3 — the stone lands. The payoff for showing up. */}
          <Cairn stones={shown} max={21} animateLast={justClosed && !reduce} />
        </div>
        <div className="min-w-0 flex-1">
          <motion.p
            ref={(el) => {
              if (el && justClosed) el.focus({ preventScroll: true });
            }}
            tabIndex={-1}
            initial={reduce || !justClosed ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, ease: EASE, delay: 0.18 }}
            className="text-sm text-hi focus:outline-none"
          >
            {fmtDay(dayIndex)} closed.{" "}
            <span className="text-lo">
              {shown.length} {shown.length === 1 ? "stone" : "stones"} on the cairn.
            </span>
          </motion.p>
          {task && (
            <p className="mt-1 text-2xs text-lo">
              tomorrow, first thing — <span className="text-mid">{task}</span>
            </p>
          )}
          <button
            type="button"
            disabled={reopen.pending}
            onClick={async () => {
              setClosed(false);
              setJustClosed(false);
              setJustReopened(true);
              const r = await reopen.run();
              if (!r.ok) setClosed(true);
            }}
            className="tap mt-2 text-xs text-lo underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-mid"
          >
            reopen — I have more in me
          </button>
          {reopen.error && (
            <p role="alert" className="note mt-1 text-bad">
              {reopen.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        // the stone lands optimistically; if the write does not, it is taken
        // back and the two sentences stay in their fields. A second submit
        // while the first is in flight is ignored rather than closing twice.
        if (close.pending) return;
        setClosed(true);
        setJustClosed(true);
        const r = await close.run({
          learned: learned.trim() || undefined,
          tomorrowFirstTask: task.trim() || undefined,
          minutes: minutes ? Math.min(Number(minutes), 1440) : undefined,
        });
        if (!r.ok) {
          setClosed(false);
          setJustClosed(false);
        }
      }}
      className="space-y-3"
    >
      <Field label="what you learned">
        <Textarea
          ref={(el) => {
            if (el && justReopened) el.focus({ preventScroll: true });
          }}
          value={learned}
          onChange={(e) => setLearned(e.target.value)}
          required
          rows={2}
          maxLength={2000}
          placeholder="one honest sentence — not a summary of what you read"
          className="prose-cairn resize-y py-2"
        />
      </Field>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="tomorrow, first thing" className="min-w-48 flex-1">
          <Input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            maxLength={300}
            placeholder="the exact task you open first"
          />
        </Field>

        <Field label="minutes" className="w-24">
          <Input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>

        <Button type="submit" variant="primary" size="md" pending={close.pending} className="py-1.5">
          close the day
        </Button>
      </div>

      {close.error && (
        <p role="alert" className="note text-bad">
          {close.error}
        </p>
      )}

      <p className="note text-lo">
        Closing is what moves you along the trail — not the calendar. Skip a week and
        tomorrow is still {fmtDay(dayIndex + 1)}.
      </p>
    </form>
  );
}
