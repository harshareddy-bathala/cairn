"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { schedule } from "@/lib/recall";
import { WEEK_REVIEW_PROMPTS, type Grade } from "@/content/review";

const gradeSchema = z.enum(["again", "hard", "good", "easy"]);
const idSchema = z.number().int().positive();

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/**
 * Grades one card and writes its next schedule.
 *
 * The card's current state is read and the new state written in a single
 * statement. Reading first and then updating would be two round trips for one
 * keypress, and this is the one action in the app a user performs twenty times
 * in a row — the latency compounds in a way it does not anywhere else.
 *
 * The arithmetic itself stays in TypeScript (`schedule`) rather than becoming
 * SQL, because it is the one piece of this feature worth being able to test
 * without a database. So the statement fetches, and the *next* call carries the
 * computed result: we compute against the row we just read, guarded by a
 * `where` on the values we read it at, so a double-submit cannot double-space
 * a card.
 */
export async function gradeCard(cardId: number, grade: string) {
  const userId = await requireUser();
  const id = idSchema.parse(cardId);
  const g = gradeSchema.parse(grade) as Grade;

  const cur = await db.execute<{
    ease: number;
    interval_days: number;
    lapses: number;
    reviews: number;
    day_index: number;
  }>(sql`
    select f.ease, f.interval_days, f.lapses, f.reviews,
           coalesce((select max(day_index) from journey_days where user_id = ${userId}), 0)
             as day_index
    from flashcards f
    where f.id = ${id} and f.user_id = ${userId}
  `);

  const row = cur.rows[0];
  if (!row) throw new Error("unknown card");

  const next = schedule(
    {
      ease: Number(row.ease),
      intervalDays: Number(row.interval_days),
      lapses: Number(row.lapses),
      reviews: Number(row.reviews),
    },
    g,
    Number(row.day_index),
  );

  // The guard on `reviews` makes this idempotent under a double submit: the
  // second write finds the review count already advanced and changes nothing.
  await db.execute(sql`
    update flashcards set
      ease = ${next.ease},
      interval_days = ${next.intervalDays},
      lapses = ${next.lapses},
      reviews = ${next.reviews},
      due_day_index = ${next.dueDayIndex},
      last_reviewed_day = ${Number(row.day_index)}
    where id = ${id} and user_id = ${userId} and reviews = ${Number(row.reviews)}
  `);

  revalidatePath("/review");
  return { intervalDays: next.intervalDays, dueDayIndex: next.dueDayIndex };
}

/**
 * Buries a card until the next journey week.
 *
 * The escape hatch for a card that is correct but badly written, or one you
 * have simply had enough of today. Without it the honest response to a bad
 * card is to grade it "good" dishonestly, which corrupts the schedule of every
 * card around it.
 */
export async function buryCard(cardId: number) {
  const userId = await requireUser();
  const id = idSchema.parse(cardId);

  await db.execute(sql`
    update flashcards
    set due_day_index = coalesce(
      (select max(day_index) from journey_days where user_id = ${userId}), 0
    ) + 7
    where id = ${id} and user_id = ${userId}
  `);

  revalidatePath("/review");
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * the journey-week review
 * ------------------------------------------------------------------ */

const reviewSchema = z.object({
  journeyWeek: z.number().int().min(1).max(60),
  answers: z.record(z.string().max(40), z.string().max(2000)),
  threePriorities: z.array(z.string().max(200)).max(3),
});

/**
 * Records the end-of-journey-week review.
 *
 * Keyed by journey week rather than calendar week, like everything else here —
 * a week is seven active days, so the review arrives when you have done the
 * work, not when Sunday arrives.
 */
export async function submitWeekReview(input: {
  journeyWeek: number;
  answers: Record<string, string>;
  threePriorities: string[];
}) {
  const userId = await requireUser();
  const parsed = reviewSchema.parse(input);

  // drop prompts we do not recognise rather than storing whatever was posted
  const known: Set<string> = new Set(WEEK_REVIEW_PROMPTS.map((p) => p.id));
  const answers = Object.fromEntries(
    Object.entries(parsed.answers).filter(([k, v]) => known.has(k) && v.trim()),
  );
  const priorities = parsed.threePriorities.map((p) => p.trim()).filter(Boolean);

  await db.execute(sql`
    insert into week_reviews (user_id, journey_week, answers, three_priorities, submitted_at)
    values (
      ${userId}, ${parsed.journeyWeek},
      ${JSON.stringify(answers)}::jsonb, ${JSON.stringify(priorities)}::jsonb, now()
    )
    on conflict (user_id, journey_week) do update set
      answers = excluded.answers,
      three_priorities = excluded.three_priorities,
      submitted_at = excluded.submitted_at
  `);

  revalidatePath("/review");
  revalidatePath("/today");
  return { ok: true };
}
