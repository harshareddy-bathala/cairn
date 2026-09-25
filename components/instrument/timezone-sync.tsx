"use client";

import { useEffect, useState } from "react";
import { useAction } from "@/lib/use-action";
import { saveReminderSchedule } from "@/app/actions/reminders";
import type { ReminderKind } from "@/lib/reminder-slots";

/**
 * Every reminder time is local, so the stored zone is load-bearing — a stale one
 * silently moves the whole schedule. This notices, and only when it actually
 * differs from the browser's.
 */
/**
 * Compares zones by the clock they show, not by their names — `Asia/Calcutta`
 * is a deprecated alias for `Asia/Kolkata`, and warning that one is "different"
 * from the other is noise the user cannot act on.
 */
function sameZone(a: string, b: string) {
  try {
    const now = new Date();
    const at = (tz: string) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short", timeStyle: "medium" })
        .format(now);
    return at(a) === at(b);
  } catch {
    return true;
  }
}

export function TimezoneSync({
  timezone,
  slots,
}: {
  timezone: string;
  slots: { kind: ReminderKind; at: string; enabled: boolean }[];
}) {
  const [detected, setDetected] = useState<string | null>(null);
  const save = useAction(saveReminderSchedule);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !sameZone(tz, timezone)) setDetected(tz);
  }, [timezone]);

  if (!detected) return null;

  return (
    <p className="note mt-3 text-warn">
      This browser is in {detected}, the schedule resolves against {timezone}.{" "}
      <button
        type="button"
        disabled={save.pending}
        onClick={async () => {
          const r = await save.run({ slots, timezone: detected });
          if (r.ok) setDetected(null);
        }}
        className="underline underline-offset-2 hover:text-hi disabled:opacity-40"
      >
        use {detected}
      </button>
      {save.error && <span role="alert" className="ml-2 text-bad">{save.error}</span>}
    </p>
  );
}
