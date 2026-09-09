import { cache } from "react";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { journeyDays, unitProgress, units, modules } from "@/db/schema";

/** 13 weeks of curriculum, paced against ~90 active days. No calendar anywhere. */
export { TARGET_ACTIVE_DAYS } from "@/content/cadence";
import { TARGET_ACTIVE_DAYS } from "@/content/cadence";

/** how far behind you may fall before the pace budget is spent — one journey week */
export const SLACK_DAYS = 7;

export type JourneyState = {
  /** how many days you have actually shown up — your position on the trail */
  dayIndex: number;
  /** 7 active days = 1 journey week */
  journeyWeek: number;
  stones: { dayIndex: number; mode: "normal" | "catchup" | "bad_day" }[];
  /** consecutive calendar days closed, counting back from the last one. This is
   *  the only place the calendar is allowed to judge you. */
  streak: number;
  longestStreak: number;
  /** today is open but not yet closed — the streak is live and losable */
  streakAtRisk: boolean;
  /** today's pace setting and shape */
  mode: "normal" | "catchup" | "bad_day";
  multiplier: number;
  unitsDone: number;
  unitsTotal: number;
  /** units per active day */
  velocity: number;
  /** units per active day needed to finish the remaining curriculum on time */
  requiredVelocity: number;
  /** 0..1 of the pace budget unspent */
  paceBudget: number;
  todayOpen: boolean;
  todayClosed: boolean;
  /** nothing has started yet — suppress velocity judgements */
  atTrailhead: boolean;
};

export function journeyWeekOf(dayIndex: number) {
  return Math.max(1, Math.ceil(dayIndex / 7));
}

export async function getJourneyState(userId: string): Promise<JourneyState> {
  // One statement. Three parallel queries would be three TLS handshakes.
  const res = await db.execute<{ data: RawState }>(sql`
    select json_build_object(
      'days', coalesce((
        select json_agg(json_build_object(
          'dayIndex', day_index, 'mode', mode, 'multiplier', multiplier,
          'calendarDate', calendar_date, 'closed', closed_at is not null
        ) order by day_index)
        from journey_days where user_id = ${userId}
      ), '[]'::json),
      'unitsDone', (
        select count(*)::int from unit_progress
        where user_id = ${userId} and state = 'done'
      ),
      'unitsTotal', (select count(*)::int from units),
      'today', to_char((now() at time zone (
        select coalesce(timezone, 'Asia/Kolkata') from users where id = ${userId}
      ))::date, 'YYYY-MM-DD')
    ) as data
  `);

  const raw = res.rows[0]!.data;
  const days = raw.days ?? [];
  const closed = days.filter((d) => d.closed);
  const dayIndex = days.length;
  const unitsDone = raw.unitsDone ?? 0;
  const unitsTotal = raw.unitsTotal ?? 0;

  const atTrailhead = closed.length === 0;
  const activeDays = Math.max(1, closed.length);
  const velocity = atTrailhead ? 0 : unitsDone / activeDays;
  const daysLeft = Math.max(1, TARGET_ACTIVE_DAYS - closed.length);
  const requiredVelocity = Math.max(0, unitsTotal - unitsDone) / daysLeft;

  // Pace budget, as an SLO error budget rather than an instantaneous ratio.
  //
  // The units you "should" have by now, against a whole journey week of slack.
  // An instantaneous velocity/required ratio reads 0% the moment you close a
  // first day with nothing finished, which is a failure state greeting you
  // before you have had a chance to fail — the exact thing that made the dated
  // roadmap punishing. You get a full week of debt before this empties.
  const expected = (unitsTotal * closed.length) / TARGET_ACTIVE_DAYS;
  const allowance = Math.max(1, (unitsTotal * SLACK_DAYS) / TARGET_ACTIVE_DAYS);
  const deficit = Math.max(0, expected - unitsDone);
  const paceBudget = atTrailhead ? 1 : Math.max(0, Math.min(1, 1 - deficit / allowance));

  const last = days.at(-1);
  const streaks = streaksOf(closed.map((d) => d.calendarDate), raw.today);

  return {
    dayIndex,
    journeyWeek: journeyWeekOf(Math.max(1, dayIndex)),
    stones: closed.map((d) => ({ dayIndex: d.dayIndex, mode: d.mode })),
    streak: streaks.current,
    longestStreak: streaks.longest,
    streakAtRisk: Boolean(last && !last.closed),
    mode: last?.mode ?? "normal",
    multiplier: last?.multiplier ?? 1,
    unitsDone,
    unitsTotal,
    velocity,
    requiredVelocity,
    paceBudget,
    todayOpen: Boolean(last && !last.closed),
    todayClosed: Boolean(last?.closed),
    atTrailhead,
  };
}

type RawState = {
  days: {
    dayIndex: number;
    mode: "normal" | "catchup" | "bad_day";
    multiplier: number;
    calendarDate: string;
    closed: boolean;
  }[];
  unitsDone: number;
  unitsTotal: number;
  today: string;
};

/**
 * Request-scoped memo. The layout renders the rail and the page renders the
 * readouts from the same state; without this that is two round trips for one
 * answer. Scripts import the uncached function directly.
 */
export const getJourneyStateCached = cache(getJourneyState);

/** the next unseen unit in each learning track — a stand-in until the Day 4 planner */
export async function getNextUnits(userId: string, trackSlugs: string[]) {
  const rows = await db
    .select({
      unitSlug: units.slug,
      unitTitle: units.title,
      objective: units.objective,
      estMinutes: units.estMinutes,
      moduleSlug: modules.slug,
      moduleTitle: modules.title,
      trackSlug: modules.trackSlug,
      state: unitProgress.state,
    })
    .from(units)
    .innerJoin(modules, eq(units.moduleSlug, modules.slug))
    .leftJoin(
      unitProgress,
      and(eq(unitProgress.unitSlug, units.slug), eq(unitProgress.userId, userId)),
    )
    .orderBy(asc(modules.order), asc(units.order));

  return trackSlugs
    .map((t) => rows.find((r) => r.trackSlug === t && r.state !== "done"))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
}

/** the user's local calendar date, used only for streak math — never shown as a deadline */
export function localDate(timezone: string, at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Opens today if it is not already open, and returns its day_index.
 *
 * This is the one place day_index advances, and it advances on *showing up* —
 * not on the calendar turning over. Skip five days and the next day you open
 * is still the very next day_index; only the streak notices the gap.
 */
export async function openToday(userId: string): Promise<number> {
  // One round trip. The user's local date is computed in Postgres from their
  // stored timezone, the day_index is derived, the row is inserted if today is
  // not already open, and started_at is stamped on the first ever day.
  const res = await db.execute<{ day_index: number }>(sql`
    with tz as (
      select coalesce(timezone, 'Asia/Kolkata') as tz from users where id = ${userId}
    ),
    today as (
      select to_char((now() at time zone (select tz from tz))::date, 'YYYY-MM-DD') as d
    ),
    existing as (
      select day_index from journey_days
      where user_id = ${userId} and calendar_date = (select d from today)
    ),
    started as (
      update users set started_at = now()
      where id = ${userId} and started_at is null
      returning 1
    ),
    ins as (
      insert into journey_days (user_id, day_index, calendar_date)
      select
        ${userId},
        (select coalesce(max(day_index), 0) + 1 from journey_days where user_id = ${userId}),
        (select d from today)
      where not exists (select 1 from existing)
      on conflict do nothing
      returning day_index
    )
    select day_index from ins
    union all
    select day_index from existing
    limit 1
  `);

  const row = res.rows[0];
  if (!row) throw new Error("could not open today");
  return Number(row.day_index);
}

function dayNumber(isoDate: string) {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}

/**
 * The streak, and the one deliberate exception to "no calendar".
 *
 * `day_index` must never notice a gap — that is what made the dated roadmap
 * punishing. But a streak that cannot break is not a streak, so this counts
 * consecutive *calendar* days on which a day was closed. Miss a Tuesday and you
 * lose the streak; you do not lose your place on the trail, and nothing is
 * marked overdue.
 */
export function streaksOf(closedDates: string[], today: string) {
  const days = [...new Set(closedDates)].map(dayNumber).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Today still counts as unbroken while it is in progress — the streak is only
  // lost once a whole day has passed without a close.
  const gap = dayNumber(today) - days[days.length - 1];
  return { current: gap <= 1 ? run : 0, longest };
}
