import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { ReminderStatus } from "@/db/schema";
import { esc, type InlineButton } from "@/lib/telegram";
import { REMINDER_GRACE_MIN, type ReminderKind } from "@/lib/reminder-slots";
import { aptitudeTopicFor } from "@/content/aptitude";
import { streaksOf } from "@/lib/journey";
import { fmtMin } from "@/lib/format";

/**
 * The schedule half lives in `reminder-slots.ts` because the settings UI needs
 * it in the browser, and everything in this file reaches the database. Re-exported
 * so server callers still have one import to think about.
 */
export * from "@/lib/reminder-slots";

/* ------------------------------------------------------------------ *
 * context
 * ------------------------------------------------------------------ */

/**
 * The stored plan, typed structurally rather than imported.
 *
 * `lib/planner.ts` owns the real `DayPlan`. A reminder only ever reads a few
 * fields off it, and it must keep rendering an older plan that was written to
 * the column before the generator last changed shape — so this describes what
 * the message needs and tolerates the rest.
 */
export type StoredPlan = {
  dayIndex?: number;
  mode?: string;
  multiplier?: number;
  budgetMin?: number;
  plannedMin?: number;
  blocks?: {
    id: string;
    kind: string;
    title: string;
    detail?: string | null;
    minutes?: number;
    unitSlug?: string | null;
  }[];
  ticked?: string[];
};

export type ReminderContext = {
  userId: string;
  chatId: string;
  handle: string | null;
  timezone: string;
  kind: ReminderKind;
  at: string;
  /** the user's local date this slot belonged to — the idempotency key */
  localDate: string;
  /** day_index of the row for today's local date, or null when today was never opened */
  todayIndex: number | null;
  todayClosed: boolean;
  plan: StoredPlan | null;
  /** the highest day_index reached so far */
  lastDayIndex: number;
  /** the parting note from the last day actually closed */
  tomorrowFirstTask: string | null;
  closedDates: string[];
  redoDue: number;
  doneUnits: string[];
};

/**
 * Everything a message needs about one person's day, selected against any row
 * that exposes `id`, `tz`, `telegram_chat_id`, `handle`, `kind`, `at` and
 * `local_date` under the alias `d`. Shared by the tick and the bot's own
 * commands so the two can never describe the same day differently.
 */
const CONTEXT_JSON = sql`json_build_object(
    'userId', d.id,
    'chatId', d.telegram_chat_id,
    'handle', d.handle,
    'timezone', d.tz,
    'kind', d.kind,
    'at', d.at,
    'localDate', d.local_date,
    'todayIndex', (
      select day_index from journey_days
      where user_id = d.id and calendar_date = d.local_date
    ),
    'todayClosed', coalesce((
      select closed_at is not null from journey_days
      where user_id = d.id and calendar_date = d.local_date
    ), false),
    'plan', (
      select plan from journey_days
      where user_id = d.id and calendar_date = d.local_date
    ),
    'lastDayIndex', coalesce(
      (select max(day_index) from journey_days where user_id = d.id), 0
    ),
    'tomorrowFirstTask', (
      select tomorrow_first_task from journey_days
      where user_id = d.id and closed_at is not null
      order by day_index desc limit 1
    ),
    'closedDates', coalesce((
      select json_agg(calendar_date order by calendar_date)
      from journey_days where user_id = d.id and closed_at is not null
    ), '[]'::json),
    'redoDue', coalesce((
      select count(*)::int from problem_attempts a
      where a.user_id = d.id and a.redo_cleared_at is null and a.redo_due_day is not null
        and a.redo_due_day <= coalesce(
          (select day_index from journey_days where user_id = d.id and calendar_date = d.local_date),
          (select coalesce(max(day_index), 0) + 1 from journey_days where user_id = d.id)
        )
    ), 0),
    'doneUnits', coalesce((
      select json_agg(unit_slug) from unit_progress
      where user_id = d.id and state = 'done'
    ), '[]'::json)
)`;

/**
 * Every reminder that is due right now, with everything a message needs.
 *
 * One statement. The database is ~90ms away and the tick is on a schedule, so
 * the cost that matters is not the tick's own latency but the number of round
 * trips it makes per user — the naive shape here is one query to find due
 * slots and then five more per user to describe their day.
 *
 * This is READ-ONLY against `journey_days` by construction. A reminder must
 * never call `openToday`: day_index advances on showing up, and a cron firing
 * at 07:00 is not the user showing up. Nudging someone about day 14 must not be
 * the thing that creates day 14.
 */
export async function dueReminders(opts: { userId?: string; graceMin?: number } = {}) {
  const grace = opts.graceMin ?? REMINDER_GRACE_MIN;

  const res = await db.execute<{ data: ReminderContext }>(sql`
    with u as (
      select id, handle, telegram_chat_id, reminder_slots,
             coalesce(timezone, 'Asia/Kolkata') as tz
      from users
      where telegram_chat_id is not null
        ${opts.userId ? sql`and id = ${opts.userId}` : sql``}
    ),
    t as (
      select u.*, (now() at time zone u.tz) as local_ts from u
    ),
    slot as (
      select t.*,
             s.value->>'kind' as kind,
             s.value->>'at' as at
      from t, lateral jsonb_array_elements(t.reminder_slots) s
      where coalesce((s.value->>'enabled')::boolean, false)
        and s.value->>'at' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    ),
    due as (
      select slot.*,
             to_char(local_ts::date, 'YYYY-MM-DD') as local_date,
             extract(epoch from (local_ts - (local_ts::date + (at)::time))) / 60 as late_min
      from slot
    )
    select ${CONTEXT_JSON} as data
    from due d
    where d.late_min >= 0
      and d.late_min < ${grace}
      and not exists (
        select 1 from reminder_sends r
        where r.user_id = d.id and r.kind = d.kind and r.local_date = d.local_date
      )
  `);

  return res.rows.map((r) => r.data);
}

/**
 * The same context, for a chat asking rather than a clock telling.
 *
 * Also read-only. `/plan` on a day you have not opened reports that the day is
 * unopened — it does not quietly open it on your behalf.
 */
export async function contextForChat(chatId: string, kind: ReminderKind): Promise<ReminderContext | null> {
  const res = await db.execute<{ data: ReminderContext }>(sql`
    with u as (
      select id, handle, telegram_chat_id, coalesce(timezone, 'Asia/Kolkata') as tz
      from users where telegram_chat_id = ${chatId}
    ),
    d as (
      select u.*, ${kind}::text as kind, ''::text as at,
             to_char((now() at time zone u.tz)::date, 'YYYY-MM-DD') as local_date
      from u
    )
    select ${CONTEXT_JSON} as data from d
  `);
  return res.rows[0]?.data ?? null;
}

/** Records the outcome of a tick. Failures write nothing, so they retry. */
export async function recordSends(
  rows: { userId: string; kind: ReminderKind; localDate: string; status: ReminderStatus; dayIndex: number | null; reason: string | null }[],
) {
  if (rows.length === 0) return;
  await db.execute(sql`
    insert into reminder_sends (user_id, kind, local_date, status, day_index, reason)
    select x.user_id, x.kind, x.local_date, x.status, x.day_index, x.reason
    from jsonb_to_recordset(${JSON.stringify(rows.map((r) => ({
      user_id: r.userId,
      kind: r.kind,
      local_date: r.localDate,
      status: r.status,
      day_index: r.dayIndex,
      reason: r.reason,
    })))}::jsonb)
      as x(user_id text, kind text, local_date text, status text, day_index int, reason text)
    on conflict (user_id, kind, local_date) do nothing
  `);
}

/* ------------------------------------------------------------------ *
 * the messages
 * ------------------------------------------------------------------ */

export function appUrl() {
  return (process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** the day the message is about: today's if open, otherwise the one they'd get */
function subjectDay(ctx: ReminderContext) {
  return ctx.todayIndex ?? ctx.lastDayIndex + 1;
}

function openBlocks(ctx: ReminderContext) {
  const ticked = new Set(ctx.plan?.ticked ?? []);
  const done = new Set(ctx.doneUnits);
  return (ctx.plan?.blocks ?? []).filter(
    (b) => b.kind !== "close" && !ticked.has(b.id) && !(b.unitSlug && done.has(b.unitSlug)),
  );
}

export type ComposedReminder =
  | { send: true; text: string; buttons: InlineButton[]; dayIndex: number | null }
  | { send: false; reason: string; dayIndex: number | null };

const skip = (ctx: ReminderContext, reason: string): ComposedReminder => ({
  send: false,
  reason,
  dayIndex: ctx.todayIndex,
});

/**
 * Turns a due slot into the message it should send, or into a reason it should
 * not. Pure: the same context always produces the same text, so a message can
 * be inspected without a bot token.
 *
 * Every branch obeys one rule — a reminder may report the state of the trail,
 * never scold about it. Nothing here says late, missed, behind or overdue,
 * because in this product none of those exist. Only the streak can be lost,
 * and only the streak-risk slot is allowed to mention it.
 */
export function composeReminder(ctx: ReminderContext): ComposedReminder {
  const day = subjectDay(ctx);
  const url = appUrl();
  const open = [{ text: "Open today", url: `${url}/today` }];
  const streak = streaksOf(ctx.closedDates, ctx.localDate).current;

  switch (ctx.kind) {
    case "morning_plan": {
      if (ctx.todayClosed) return skip(ctx, "day already closed");

      if (ctx.todayIndex && ctx.plan?.blocks?.length) {
        const p = ctx.plan;
        const pace = p.multiplier && p.multiplier > 1 ? ` · ${p.multiplier}× catch-up` : "";
        const mode = p.mode === "bad_day" ? " · minimum chain" : pace;
        const lines = p.blocks!.map((b) => `· ${esc(b.title)}`);
        return {
          send: true,
          dayIndex: ctx.todayIndex,
          buttons: open,
          text: [
            `<b>Day ${day} · plan</b>`,
            `${fmtMin(p.plannedMin ?? 0)} planned${mode}`,
            "",
            ...lines,
            ...(ctx.redoDue > 0 ? ["", `${ctx.redoDue} in the redo queue.`] : []),
          ].join("\n"),
        };
      }

      if (ctx.todayIndex) {
        return {
          send: true,
          dayIndex: ctx.todayIndex,
          buttons: open,
          text: `<b>Day ${day} is open</b>\nThe plan builds itself when you open Today.`,
        };
      }

      // The day was never opened, and that is not a failure. This is the message
      // the dated roadmap could not send without turning something red.
      const note = ctx.tomorrowFirstTask
        ? `\nYou left a note closing day ${ctx.lastDayIndex}:\n<i>${esc(ctx.tomorrowFirstTask)}</i>\n`
        : "";
      return {
        send: true,
        dayIndex: null,
        buttons: open,
        text: `<b>Day ${day} is unopened</b>\n${note}\nNothing is overdue. Open it when you start.`,
      };
    }

    case "aptitude": {
      if (ctx.todayClosed) return skip(ctx, "day already closed");
      const a = aptitudeTopicFor(day);
      return {
        send: true,
        dayIndex: ctx.todayIndex,
        buttons: [{ text: "Aptitude", url: `${url}/aptitude` }],
        text: [
          `<b>Aptitude · day ${day}</b>`,
          `25 questions — ${esc(a.topic)} (${a.pool}). Timed, 30 minutes.`,
        ].join("\n"),
      };
    }

    case "evening_block": {
      if (!ctx.todayIndex) return skip(ctx, "day not opened");
      if (ctx.todayClosed) return skip(ctx, "day already closed");
      if (!ctx.plan?.blocks?.length) return skip(ctx, "no plan on the day");

      const left = openBlocks(ctx);
      if (left.length === 0) return skip(ctx, "plan complete");

      const leftMin = left.reduce((n, b) => n + (b.minutes ?? 0), 0);
      return {
        send: true,
        dayIndex: ctx.todayIndex,
        buttons: open,
        text: [
          `<b>Day ${day} · ${left.length} open</b>`,
          `${fmtMin(leftMin)} left of ${fmtMin(ctx.plan.plannedMin ?? leftMin)}`,
          "",
          ...left.map((b) => `· ${esc(b.title)}`),
        ].join("\n"),
      };
    }

    case "close_day": {
      if (!ctx.todayIndex) return skip(ctx, "day not opened");
      if (ctx.todayClosed) return skip(ctx, "day already closed");
      return {
        send: true,
        dayIndex: ctx.todayIndex,
        buttons: [{ text: "Close the day", url: `${url}/today#close` }],
        text: [
          `<b>Day ${day} · not closed</b>`,
          "Two lines and the stone is placed: what you learned, and tomorrow's first task.",
        ].join("\n"),
      };
    }

    case "streak_risk": {
      if (ctx.todayClosed) return skip(ctx, "day closed, nothing at risk");
      if (streak === 0) return skip(ctx, "no streak at risk");

      // The one deliberate exception to "nothing is ever overdue" — and it is
      // scoped precisely: the streak is losable, your place on the trail is not.
      const body = ctx.todayIndex
        ? `Day ${day} is open and unclosed.\nA bad day still counts — one problem and the log keeps it.`
        : `Day ${day} is unopened.\nYour place on the trail is safe either way; only the streak ends.`;
      return {
        send: true,
        dayIndex: ctx.todayIndex,
        buttons: open,
        text: `<b>Streak ${streak} · at risk</b>\n${body}`,
      };
    }
  }
}
