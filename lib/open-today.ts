import { sql, type SQL } from "drizzle-orm";

/**
 * Opening today — the one place day_index advances.
 *
 * It advances on *showing up*, not on the calendar turning over: skip five days
 * and the next day you open is still the very next day_index. The user's local
 * date is computed in Postgres from their stored timezone, the row is inserted
 * if today is not already open, and started_at is stamped on the first ever
 * day, all as CTEs so the caller stays at one round trip.
 *
 * The CTEs it defines, for the statement to build on:
 *   today  (d, dow)   the local date and ISO weekday
 *   day    the journey_days row for today — freshly inserted or existing
 *
 * This used to be written out three times (journey, planner, progress actions),
 * and each copy had the same hole: two requests opening the same new day both
 * see no row, both insert, one wins, and the loser's `on conflict do nothing`
 * leaves its `day` empty. Pair it with `retryUnopened`.
 */
export function openTodayCte(userId: string): SQL {
  return sql`
    tz as (
      select coalesce(timezone, 'Asia/Kolkata') as tz from users where id = ${userId}
    ),
    today as (
      select to_char((now() at time zone (select tz from tz))::date, 'YYYY-MM-DD') as d,
             extract(isodow from (now() at time zone (select tz from tz))::date)::int as dow
    ),
    existing as (
      select * from journey_days
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
      -- returning * carries the column defaults, which a sibling CTE could not
      -- read back from the table within the same statement
      returning *
    ),
    day as (
      select * from ins union all select * from existing limit 1
    )
  `;
}

/**
 * Runs a statement built on `openTodayCte`, and once more if it lost the race.
 *
 * On the second run the winner's row is committed and visible as `existing`,
 * so it cannot lose again. Every write in such a statement hangs off `day`, so
 * an empty first run wrote nothing and repeating it is safe.
 */
export async function retryUnopened<T>(run: () => Promise<T>, opened: (result: T) => boolean): Promise<T> {
  const first = await run();
  return opened(first) ? first : run();
}
