"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetProgress } from "@/app/actions/reset";
import { RESET_PHRASE } from "@/lib/reset-phrase";
import { cn } from "@/lib/cn";

type Summary = {
  days: number;
  units: number;
  problems: number;
  certificates: number;
  other: number;
};

/**
 * Starting over.
 *
 * Three deliberate acts, because there is no undo: open it, read what goes,
 * type the phrase. The counts are shown rather than described — "4 days, 72
 * units, 1 certificate" is a sentence you can weigh, and "all your progress"
 * is not.
 */
export function ResetProgress({ summary }: { summary: Summary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const armed = typed.trim().toLowerCase() === RESET_PHRASE;
  const nothingToLose =
    summary.days + summary.units + summary.problems + summary.certificates + summary.other === 0;

  const lines: [number, string][] = [
    [summary.days, summary.days === 1 ? "day on the cairn" : "days on the cairn"],
    [summary.units, summary.units === 1 ? "unit marked done" : "units marked done"],
    [summary.problems, summary.problems === 1 ? "problem attempt" : "problem attempts"],
    [summary.certificates, summary.certificates === 1 ? "certificate" : "certificates"],
    [summary.other, "logged items — applications, deliverables, drills, mocks"],
  ];

  if (nothingToLose) {
    return (
      <p className="text-2xs leading-relaxed text-lo">
        Nothing to reset yet — the trail has not started.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-2xs leading-relaxed text-lo">
          Clears the trail and starts the journey at day one. Your account, handle,
          timezone, Telegram link, budget and reminder schedule all stay.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap shrink-0 rounded-[3px] border border-line px-4 py-1.5 text-sm text-mid transition-colors duration-[120ms] hover:border-bad hover:text-bad"
        >
          reset progress
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="legend mb-2 text-bad">this deletes, and there is no undo</p>
        <ul className="space-y-1">
          {lines
            .filter(([n]) => n > 0)
            .map(([n, label]) => (
              <li key={label} className="flex items-baseline gap-3 text-sm">
                <span className="w-10 shrink-0 text-right tabular-nums text-bad">{n}</span>
                <span className="text-mid">{label}</span>
              </li>
            ))}
        </ul>
      </div>

      <label className="block">
        <span className="legend">
          type <span className="text-hi">{RESET_PHRASE}</span> to confirm
          {error && <span className="ml-2 text-bad">{error}</span>}
        </span>
        <input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          className={cn(
            "mt-1 w-full max-w-xs rounded-[3px] border bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:outline-none",
            error ? "border-bad" : "border-line focus:border-phos-dim",
          )}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!armed || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await resetProgress(typed);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setOpen(false);
              setTyped("");
              // /start, not /today: landing on Today calls openToday, which would
              // stamp day 1 before the reset has even been read as finished. The
              // reset clears onboardedAt, so self-placement is the right re-entry.
              router.push("/start");
              router.refresh();
            })
          }
          className={cn(
            "tap rounded-[3px] border px-4 py-1.5 text-sm transition-colors duration-[120ms]",
            armed
              ? "border-bad text-bad hover:bg-bad/10"
              : "border-line-soft text-lo opacity-50",
          )}
        >
          {pending ? "resetting…" : "reset everything"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          className="tap px-1 text-2xs text-lo transition-colors duration-[120ms] hover:text-mid"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
