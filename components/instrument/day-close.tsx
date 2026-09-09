"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Cairn, type Stone } from "./cairn";
import { closeDay, reopenDay } from "@/app/actions/day";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

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
  const [, startTransition] = useTransition();
  const [closed, setClosed] = useState(initialClosed);
  const [justClosed, setJustClosed] = useState(false);
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
            initial={reduce || !justClosed ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, ease: EASE, delay: 0.18 }}
            className="text-sm text-hi"
          >
            Day {String(dayIndex).padStart(3, "0")} closed.{" "}
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
            onClick={() =>
              startTransition(async () => {
                setClosed(false);
                setJustClosed(false);
                await reopenDay();
              })
            }
            className="mt-2 text-2xs text-lo underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-mid"
          >
            reopen — I have more in me
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={() =>
        startTransition(async () => {
          setClosed(true);
          setJustClosed(true);
          await closeDay({
            learned: learned.trim() || undefined,
            tomorrowFirstTask: task.trim() || undefined,
            minutes: minutes ? Number(minutes) : undefined,
          });
        })
      }
      className="space-y-3"
    >
      <label className="block">
        <span className="legend">what you learned</span>
        <textarea
          value={learned}
          onChange={(e) => setLearned(e.target.value)}
          rows={2}
          placeholder="one honest sentence — not a summary of what you read"
          className="prose-cairn mt-1 w-full resize-none rounded-[3px] border border-line bg-ink-900 px-2.5 py-2 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1">
          <span className="legend">tomorrow, first thing</span>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="the exact task you open first"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none"
          />
        </label>

        <label className="w-24">
          <span className="legend">minutes</span>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm tabular-nums text-hi focus:border-phos-dim focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className={cn(
            "rounded-[3px] border border-line px-4 py-1.5 text-sm text-mid",
            "transition-colors duration-[120ms] hover:border-phos hover:text-phos",
          )}
        >
          close the day
        </button>
      </div>

      <p className="text-2xs leading-relaxed text-lo">
        Closing is what moves you along the trail — not the calendar. Skip a week and
        tomorrow is still day {String(dayIndex + 1).padStart(3, "0")}.
      </p>
    </form>
  );
}
