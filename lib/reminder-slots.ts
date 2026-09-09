import type { ReminderSlot } from "@/db/schema";

/* ------------------------------------------------------------------ *
 * the schedule
 * ------------------------------------------------------------------ */

export type ReminderKind = ReminderSlot["kind"];

export const REMINDER_KINDS: ReminderKind[] = [
  "morning_plan",
  "aptitude",
  "evening_block",
  "close_day",
  "streak_risk",
];

export const REMINDER_LABELS: Record<ReminderKind, { label: string; note: string }> = {
  morning_plan: { label: "Morning plan", note: "the day, already decided for you" },
  aptitude: { label: "Aptitude drill", note: "the lane that dies quietly" },
  evening_block: { label: "Evening block", note: "what is still open" },
  close_day: { label: "Close the day", note: "learned · tomorrow's first task" },
  streak_risk: { label: "Streak at risk", note: "only fires when it actually is" },
};

/**
 * The default schedule, in the user's own local time.
 *
 * These are the roadmap's own study windows, not arbitrary times: the plan lands
 * before the morning block, aptitude sits in the post-lunch slump where it was
 * always skipped, and the close lands late enough that the evening block is
 * genuinely over. Nothing here is a deadline — a missed slot costs nothing.
 */
export const DEFAULT_SLOTS: ReminderSlot[] = [
  { kind: "morning_plan", at: "07:00", enabled: true },
  { kind: "aptitude", at: "14:30", enabled: true },
  { kind: "evening_block", at: "19:00", enabled: true },
  { kind: "close_day", at: "22:00", enabled: true },
  { kind: "streak_risk", at: "22:45", enabled: true },
];

/**
 * How late a slot may still fire. The cron ticks every few minutes, so this is
 * the window a tick can land in — not a retry budget. A "good morning" that
 * arrives at 10:00 because the worker was down is worse than silence, so a
 * missed window is simply missed.
 */
export const REMINDER_GRACE_MIN = 20;

export function isValidTime(at: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(at);
}

/** Normalises whatever is in the jsonb column into exactly one slot per kind. */
export function normaliseSlots(raw: unknown): ReminderSlot[] {
  const list = Array.isArray(raw) ? (raw as Partial<ReminderSlot>[]) : [];
  return REMINDER_KINDS.map((kind) => {
    const found = list.find((s) => s?.kind === kind);
    const fallback = DEFAULT_SLOTS.find((s) => s.kind === kind)!;
    return {
      kind,
      at: found?.at && isValidTime(found.at) ? found.at : fallback.at,
      enabled: typeof found?.enabled === "boolean" ? found.enabled : fallback.enabled,
    };
  });
}
