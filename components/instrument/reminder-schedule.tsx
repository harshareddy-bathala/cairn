"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { saveReminderSchedule, sendTestReminder } from "@/app/actions/reminders";
import { REMINDER_KINDS, REMINDER_LABELS, type ReminderKind } from "@/lib/reminder-slots";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

type Slot = { kind: ReminderKind; at: string; enabled: boolean };

/**
 * The schedule, as five switches on a panel.
 *
 * Times are local and nothing here is a deadline — a slot that does not fire
 * costs nothing, which is why the copy under each row says what the message is
 * for rather than what happens if you ignore it.
 */
export function ReminderSchedule({
  slots: initial,
  timezone,
  linked,
}: {
  slots: Slot[];
  timezone: string;
  linked: boolean;
}) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();
  const [test, setTest] = useState<{ kind: ReminderKind; msg: string } | null>(null);

  function edit(kind: ReminderKind, patch: Partial<Slot>) {
    setSlots((s) => s.map((x) => (x.kind === kind ? { ...x, ...patch } : x)));
    setSaved(false);
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line-soft">
        {REMINDER_KINDS.map((kind) => {
          const slot = slots.find((s) => s.kind === kind)!;
          const meta = REMINDER_LABELS[kind];
          return (
            <li key={kind} className="flex items-center gap-3 py-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={slot.enabled}
                aria-label={meta.label}
                onClick={() => edit(kind, { enabled: !slot.enabled })}
                className={cn(
                  "tap h-4 w-4 shrink-0 rounded-full border transition-colors duration-[120ms]",
                  slot.enabled
                    ? "border-phos bg-phos/80"
                    : "border-line bg-transparent hover:border-phos-dim",
                )}
              />

              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", slot.enabled ? "text-hi" : "text-lo")}>{meta.label}</p>
                <p className="truncate text-2xs text-lo">{meta.note}</p>
              </div>

              {linked && slot.enabled && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await sendTestReminder(kind);
                      setTest({ kind, msg: r.ok ? "sent" : r.error });
                    })
                  }
                  className="legend shrink-0 px-1 text-lo hover:text-hi disabled:opacity-40"
                >
                  test
                </button>
              )}

              <input
                type="time"
                value={slot.at}
                onChange={(e) => edit(kind, { at: e.target.value })}
                disabled={!slot.enabled}
                aria-label={`${meta.label} time`}
                className={cn(
                  // wide enough for a 12-hour locale's AM/PM: the browser picks the
                  // format, and a clipped one reads as the wrong time of day
                  "w-[7.5rem] shrink-0 rounded-[3px] border border-line bg-ink-900 px-2 py-1",
                  "text-sm tabular-nums text-hi [color-scheme:dark]",
                  "focus:border-phos-dim disabled:text-lo disabled:opacity-50",
                )}
              />
            </li>
          );
        })}
      </ul>

      {test && (
        <p className="text-2xs text-lo">
          {REMINDER_LABELS[test.kind].label}: <span className="text-mid">{test.msg}</span>
        </p>
      )}

      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="legend">resolved against {timezone}</p>

        <button
          type="button"
          disabled={saved || pending}
          onClick={() =>
            startTransition(async () => {
              await saveReminderSchedule({ slots });
              setSaved(true);
            })
          }
          className={cn(
            "relative overflow-hidden rounded-[3px] border px-4 py-1.5 text-sm transition-colors duration-[120ms]",
            saved
              ? "border-line text-lo"
              : "border-phos-dim text-hi hover:border-phos",
          )}
        >
          {!saved && (
            <motion.span
              key="dirty"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: DUR.slow, ease: EASE }}
              className="pointer-events-none absolute inset-y-0 w-1/2 bg-phos/10"
            />
          )}
          <span className="relative">{saved ? "saved" : pending ? "saving…" : "commit"}</span>
        </button>
      </div>
    </div>
  );
}
