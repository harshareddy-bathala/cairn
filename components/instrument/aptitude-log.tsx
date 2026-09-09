"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { logAptitude } from "@/app/actions/sidetracks";
import { aptitudeTopicFor } from "@/content/aptitude";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

type Score = { dayIndex: number; topic: string; correct: number; total: number };

/**
 * The daily drill, logged.
 *
 * Aptitude is a pass/fail gate before a human ever reads your code, and it is
 * also the lane with nothing to show for it — no repo, no commit. A number per
 * day is the only evidence it happened.
 */
export function AptitudeLog({
  dayIndex,
  scores: initial,
}: {
  dayIndex: number;
  scores: Score[];
}) {
  const [, startTransition] = useTransition();
  const [scores, setScores] = useState(initial);
  const suggested = aptitudeTopicFor(dayIndex).topic;
  const [topic, setTopic] = useState(suggested);
  const [correct, setCorrect] = useState("");
  const [total, setTotal] = useState("25");
  const [flash, setFlash] = useState<number | null>(null);

  const loggedToday = scores.some((s) => s.dayIndex === dayIndex);

  return (
    <div className="space-y-4">
      <form
        action={() =>
          startTransition(async () => {
            const c = Number(correct);
            const t = Number(total);
            if (!Number.isFinite(c) || !Number.isFinite(t) || t <= 0 || c > t) return;
            const optimistic = { dayIndex, topic, correct: c, total: t };
            setScores((s) => [...s, optimistic]);
            setCorrect("");
            const res = await logAptitude({ topic, correct: c, total: t });
            setFlash(res.percent);
          })
        }
        className="flex flex-wrap items-end gap-3"
      >
        <label className="min-w-40 flex-1">
          <span className="legend">topic</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi focus:border-phos-dim focus:outline-none"
          />
        </label>
        <label className="w-20">
          <span className="legend">correct</span>
          <input
            value={correct}
            onChange={(e) => setCorrect(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="—"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm tabular-nums text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none"
          />
        </label>
        <label className="w-20">
          <span className="legend">of</span>
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm tabular-nums text-hi focus:border-phos-dim focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-[3px] border border-line px-4 py-1.5 text-sm text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos"
        >
          log
        </button>
        {flash != null && (
          <motion.span
            key={flash}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
            className={cn(
              "pb-1.5 text-sm tabular-nums",
              flash >= 70 ? "text-phos" : flash >= 50 ? "text-warn" : "text-bad",
            )}
          >
            {flash}%
          </motion.span>
        )}
      </form>

      {!loggedToday && (
        <p className="text-2xs leading-relaxed text-lo">
          Today's rotation is <span className="text-mid">{suggested}</span>. 25 questions,
          timed — the clock is the part that transfers.
        </p>
      )}

      {scores.length > 0 && (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {[...scores]
            .sort((a, b) => b.dayIndex - a.dayIndex)
            .slice(0, 8)
            .map((s, i) => {
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <li key={`${s.dayIndex}-${s.topic}-${i}`} className="flex items-baseline gap-3 py-1.5">
                  <span className="legend w-12 shrink-0 tabular-nums">
                    d{String(s.dayIndex).padStart(3, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-2xs text-mid">{s.topic}</span>
                  <span className="legend shrink-0 tabular-nums">
                    {s.correct}/{s.total}
                  </span>
                  <span
                    className={cn(
                      "w-10 shrink-0 text-right text-2xs tabular-nums",
                      pct >= 70 ? "text-phos" : pct >= 50 ? "text-warn" : "text-bad",
                    )}
                  >
                    {pct}%
                  </span>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
