import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { journeyDays, unitProgress, units, modules } from "@/db/schema";

/** 13 weeks of curriculum, paced against ~90 active days. No calendar anywhere. */
export const TARGET_ACTIVE_DAYS = 90;

export type JourneyState = {
  /** how many days you have actually shown up — your position on the trail */
  dayIndex: number;
  /** 7 active days = 1 journey week */
  journeyWeek: number;
  stones: { dayIndex: number; mode: "normal" | "catchup" | "bad_day" }[];
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
  const [days, doneRow, totalRow] = await Promise.all([
    db
      .select({ dayIndex: journeyDays.dayIndex, mode: journeyDays.mode, closedAt: journeyDays.closedAt })
      .from(journeyDays)
      .where(eq(journeyDays.userId, userId))
      .orderBy(asc(journeyDays.dayIndex)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(unitProgress)
      .where(and(eq(unitProgress.userId, userId), eq(unitProgress.state, "done"))),
    db.select({ n: sql<number>`count(*)::int` }).from(units),
  ]);

  const closed = days.filter((d) => d.closedAt);
  const dayIndex = days.length;
  const unitsDone = doneRow[0]?.n ?? 0;
  const unitsTotal = totalRow[0]?.n ?? 0;

  const atTrailhead = closed.length === 0;
  const activeDays = Math.max(1, closed.length);
  const velocity = atTrailhead ? 0 : unitsDone / activeDays;
  const daysLeft = Math.max(1, TARGET_ACTIVE_DAYS - closed.length);
  const requiredVelocity = Math.max(0, unitsTotal - unitsDone) / daysLeft;

  // pace budget: 1 when at or ahead of the pace the plan needs. You cannot be
  // behind before you have started, so the trailhead is always full.
  const paceBudget = atTrailhead
    ? 1
    : requiredVelocity <= 0
      ? 1
      : Math.max(0, Math.min(1, velocity / Math.max(requiredVelocity, 0.0001)));

  const last = days.at(-1);
  return {
    dayIndex,
    journeyWeek: journeyWeekOf(Math.max(1, dayIndex)),
    stones: closed.map((d) => ({ dayIndex: d.dayIndex, mode: d.mode })),
    unitsDone,
    unitsTotal,
    velocity,
    requiredVelocity,
    paceBudget,
    todayOpen: Boolean(last && !last.closedAt),
    todayClosed: Boolean(last?.closedAt),
    atTrailhead,
  };
}

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

/** how many active days in a row, counting back from the most recent closed day */
export function streakOf(stones: { dayIndex: number }[]) {
  return stones.length;
}
