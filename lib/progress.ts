import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { problemAttempts, problems, type Outcome } from "@/db/schema";
import { openTodayCte, retryUnopened } from "@/lib/open-today";

/** an editorial or a failure resurfaces this many ACTIVE days later, never calendar days */
export const REDO_DELAY_DAYS = 3;

/** Problems due to be re-solved on or before the current day. */
export async function getRedoQueue(userId: string, dayIndex: number) {
  return db
    .select({
      problemSlug: problemAttempts.problemSlug,
      redoDueDay: problemAttempts.redoDueDay,
      outcome: problemAttempts.outcome,
      title: problems.title,
      url: problems.url,
      difficulty: problems.difficulty,
      patternTag: problems.patternTag,
      triggerHint: problems.triggerHint,
      approachHint: problems.approachHint,
      estMinutes: problems.estMinutes,
      unitSlug: problems.unitSlug,
    })
    .from(problemAttempts)
    .innerJoin(problems, eq(problems.slug, problemAttempts.problemSlug))
    .where(
      and(
        eq(problemAttempts.userId, userId),
        isNull(problemAttempts.redoClearedAt),
        sql`${problemAttempts.redoDueDay} <= ${dayIndex}`,
      ),
    )
    .orderBy(problemAttempts.redoDueDay);
}

/**
 * Distinct DSA problems solved, as a scalar subquery — the one definition of
 * the number the DSA curve is drawn against.
 *
 * "Solved" is clean or with a hint; an editorial or a failure is not. Only the
 * DSA track counts: SQL drills and other tracks' problems are practice, but
 * they are not what the 95/165/230 curve measures, and counting them would move
 * the line without the skill moving. Metrics, the certificate snapshot, Cohort
 * and the public profile all read this, so they cannot disagree.
 *
 * `userId` is a value, or a column reference such as sql`u.id` in a join.
 */
export function dsaSolvedSql(userId: string | SQL, which: "solved" | "clean" = "solved") {
  const outcome = which === "clean" ? sql`a.outcome = 'clean'` : sql`a.outcome in ('clean', 'hinted')`;
  return sql`(
    select count(distinct a.problem_slug)::int
    from problem_attempts a
    join problems p on p.slug = a.problem_slug
    join modules m on m.slug = p.module_slug
    where a.user_id = ${userId} and m.track_slug = 'dsa' and ${outcome}
  )`;
}

/**
 * Records how a problem actually went, opening today if needed — one statement.
 *
 * This is the rule the whole app exists to enforce: opening the editorial means
 * the problem is NOT done, so it comes back automatically. A hint revealed
 * beforehand is consumed here, and turns a claimed "clean" into "hinted".
 * Returns null for a problem content does not define.
 */
export async function recordAttempt(
  userId: string,
  slug: string,
  claimed: Outcome,
  minutes: number | null,
) {
  // Every write below hangs off `day`, so a run that lost the race to open the
  // day wrote nothing and retryUnopened can repeat it — including the reveal,
  // which must not be consumed by a run that then recorded no attempt.
  const run = () =>
    db.execute<{
      day_index: number;
      redo_due_day: number | null;
      unit_slug: string | null;
      outcome: Outcome;
    }>(sql`
      with ${openTodayCte(userId)},
      prob as (
        select slug, unit_slug from problems where slug = ${slug}
      ),
      -- a hint opened before this outcome turns a claimed "clean" into "hinted"
      rev as (
        delete from hint_reveals
        where user_id = ${userId} and problem_slug = ${slug}
          and exists (select 1 from day) and exists (select 1 from prob)
        returning 1
      ),
      o as (
        select case when ${claimed} = 'clean' and exists (select 1 from rev)
                    then 'hinted' else ${claimed} end as outcome,
               exists (select 1 from rev) as revealed
      ),
      cleared as (
        update problem_attempts set redo_cleared_at = now()
        where user_id = ${userId} and problem_slug = ${slug} and redo_cleared_at is null
          and exists (select 1 from day)
        returning 1
      ),
      attempt as (
        insert into problem_attempts
          (user_id, problem_slug, outcome, minutes, day_index, redo_due_day, redo_cleared_at,
           hint_revealed)
        select
          ${userId}, p.slug, o.outcome, ${minutes}, d.day_index,
          case when o.outcome in ('editorial', 'failed') then d.day_index + ${REDO_DELAY_DAYS} end,
          case when o.outcome in ('editorial', 'failed') then null else now() end,
          o.revealed
        from prob p, day d, o
        returning day_index, redo_due_day, outcome
      )
      select a.day_index, a.redo_due_day, a.outcome, p.unit_slug from attempt a, prob p
    `);

  const res = await retryUnopened(run, (r) => r.rows.length > 0);
  const row = res.rows[0];
  if (!row) return null;
  return {
    dayIndex: Number(row.day_index),
    redoDueDay: row.redo_due_day == null ? null : Number(row.redo_due_day),
    /** what was recorded, which differs from what was claimed after a reveal */
    outcome: row.outcome,
    unitSlug: row.unit_slug,
  };
}

/**
 * Holds a revealed hint until the next outcome consumes it.
 *
 * It used to be written as a `hinted` attempt, and every solved-count reads
 * `hinted` as solved — so opening the hint counted as solving the problem.
 */
export async function revealHintFor(userId: string, slug: string) {
  await db.execute(sql`
    insert into hint_reveals (user_id, problem_slug)
    select ${userId}, slug from problems where slug = ${slug}
    on conflict do nothing
  `);
}
