"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { logAptitude } from "@/app/actions/sidetracks";
import { aptitudeTopicFor } from "@/content/aptitude";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";
import { useAction } from "@/lib/use-action";
import { fmtDay } from "@/lib/format";

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
  compact = false,
}: {
  dayIndex: number;
  scores: Score[];
  /** the form alone, for embedding in the plan's aptitude block */
  compact?: boolean;
}) {
  const log = useAction(logAptitude);
  const [scores, setScores] = useState(initial);
  const suggested = aptitudeTopicFor(dayIndex).topic;
  const [topic, setTopic] = useState(suggested);
  const [correct, setCorrect] = useState("");
  const [total, setTotal] = useState("25");
  const [flash, setFlash] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loggedToday = scores.some((s) => s.dayIndex === dayIndex);

  return (
    <div className="space-y-4">
      <form
        action={async () => {
          const c = Number(correct);
          const t = Number(total);
          if (correct === "") return setErr("how many did you get right?");
          if (!Number.isFinite(t) || t <= 0) return setErr("out of how many?");
          if (c > t) return setErr(`${c} out of ${t}?`);
          if (!topic.trim()) return setErr("name the topic");
          setErr(null);
          const optimistic = { dayIndex, topic, correct: c, total: t };
          setScores((s) => [...s, optimistic]);
          setCorrect("");
          const res = await log.run({ topic, correct: c, total: t });
          if (!res.ok) {
            setScores((s) => s.filter((x) => x !== optimistic));
            setCorrect(String(c));
            return;
          }
          setFlash(res.value.percent);
        }}
        // On a phone: topic on its own row, the two counts side by side,
        // then the button. At `sm` it collapses back to one line — at 326px of
        // usable width the single row wrapped mid-form, stranding "of" and the
        // button on a second line with a gap above them.
        className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end"
      >
        <label className="col-span-2 sm:min-w-40 sm:flex-1">
          <span className="legend">topic</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi focus:border-phos-dim focus:outline-none"
          />
        </label>
        <label className="sm:w-20">
          <span className="legend">correct</span>
          <input
            value={correct}
            onChange={(e) => {
              setCorrect(e.target.value.replace(/\D/g, ""));
              setErr(null);
            }}
            inputMode="numeric"
            placeholder="—"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm tabular-nums text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none"
          />
        </label>
        <label className="sm:w-20">
          <span className="legend">of</span>
          <input
            value={total}
            onChange={(e) => {
              setTotal(e.target.value.replace(/\D/g, ""));
              setErr(null);
            }}
            inputMode="numeric"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm tabular-nums text-hi focus:border-phos-dim focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={log.pending}
          className="col-span-2 rounded-[3px] border border-line px-4 py-2 text-sm text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos sm:col-span-1 sm:py-1.5"
        >
          log
        </button>
        {(err ?? log.error) && (
          <span role="alert" className="pb-1.5 text-2xs text-warn">
            {err ?? log.error}
          </span>
        )}
        {err == null && log.error == null && flash != null && (
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

      {!compact && !loggedToday && (
        <p className="note text-lo">
          Today's rotation is <span className="text-mid">{suggested}</span>. 25 questions,
          timed — the clock is the part that transfers.
        </p>
      )}

      {!compact && scores.length > 0 && (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {[...scores]
            .sort((a, b) => b.dayIndex - a.dayIndex)
            .slice(0, 8)
            .map((s, i) => {
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <li key={`${s.dayIndex}-${s.topic}-${i}`} className="flex items-baseline gap-3 py-1.5">
                  <span className="legend w-12 shrink-0 tabular-nums">
                    {fmtDay(s.dayIndex, true)}
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
