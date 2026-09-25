"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { logAptitude } from "@/app/actions/sidetracks";
import { aptitudeTopicFor } from "@/content/aptitude";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";
import { useAction } from "@/lib/use-action";
import { fmtDay } from "@/lib/format";
import { Button } from "./button";
import { Field, Input } from "./field";
import { scoreText } from "@/lib/marks";

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
  history = 8,
}: {
  dayIndex: number;
  scores: Score[];
  /** the form alone, for embedding in the plan's aptitude block */
  compact?: boolean;
  /** how many past scores to list under the form */
  history?: number;
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
        <Field label="topic" className="col-span-2 sm:min-w-40 sm:flex-1">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </Field>
        <Field label="correct" className="sm:w-20">
          <Input
            value={correct}
            onChange={(e) => {
              setCorrect(e.target.value.replace(/\D/g, ""));
              setErr(null);
            }}
            inputMode="numeric"
            placeholder="—"
            className="tabular-nums"
          />
        </Field>
        <Field label="of" className="sm:w-20">
          <Input
            value={total}
            onChange={(e) => {
              setTotal(e.target.value.replace(/\D/g, ""));
              setErr(null);
            }}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
        <Button type="submit" size="md" pending={log.pending} className="col-span-2 sm:col-span-1 sm:py-1.5">
          log
        </Button>
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
              scoreText(flash),
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
            .slice(0, history)
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
                      scoreText(pct),
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
