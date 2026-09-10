import { sql } from "drizzle-orm";
import { db } from "@/db";
import { REVIEW_OPENS_ON_DAY } from "@/content/review";

/** the shape a recorded review comes back in — safe to import from the browser */
export type WeekReview = {
  journeyWeek: number;
  answers: Record<string, string>;
  threePriorities: string[];
  submittedAt: string;
};

export type WeekReviewState = {
  /** the week the review form is currently asking about */
  currentWeek: number;
  /** true once the current journey week has enough closed days to be worth reviewing */
  due: boolean;
  /** how many active days into the current journey week you are, 1..7 */
  dayOfWeek: number;
  existing: WeekReview | null;
  past: WeekReview[];
};


export async function getWeekReviewState(userId: string): Promise<WeekReviewState> {
  const res = await db.execute<{ data: WeekReviewState }>(sql`
    with day as (
      select coalesce(max(day_index), 0) as day_index
      from journey_days where user_id = ${userId}
    ),
    wk as (
      select greatest(1, ceil(greatest(day_index, 1) / 7.0)::int) as w,
             ((greatest(day_index, 1) - 1) % 7) + 1 as dow
      from day
    ),
    rows as (
      select journey_week, answers, three_priorities, submitted_at
      from week_reviews where user_id = ${userId}
    )
    select json_build_object(
      'currentWeek', (select w from wk),
      'dayOfWeek', (select dow from wk),
      'existing', (
        select json_build_object(
          'journeyWeek', journey_week, 'answers', answers,
          'threePriorities', three_priorities, 'submittedAt', submitted_at
        ) from rows where journey_week = (select w from wk)
      ),
      'past', coalesce((
        select json_agg(json_build_object(
          'journeyWeek', journey_week, 'answers', answers,
          'threePriorities', three_priorities, 'submittedAt', submitted_at
        ) order by journey_week desc)
        from rows where journey_week < (select w from wk)
      ), '[]'::json)
    ) as data
  `);

  const raw = res.rows[0]!.data;
  return {
    currentWeek: Number(raw.currentWeek ?? 1),
    dayOfWeek: Number(raw.dayOfWeek ?? 1),
    due: Number(raw.dayOfWeek ?? 1) >= REVIEW_OPENS_ON_DAY,
    existing: raw.existing ?? null,
    past: raw.past ?? [],
  };
}
