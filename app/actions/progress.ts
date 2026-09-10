"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { problemAttempts } from "@/db/schema";
import { openToday } from "@/lib/journey";
import { REDO_DELAY_DAYS } from "@/lib/progress";

const outcomeSchema = z.enum(["clean", "hinted", "editorial", "failed"]);
const slugSchema = z.string().min(1).max(200);

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/**
 * `openToday` inlined as a CTE.
 *
 * The database is ~270ms away, so the unit of design here is the round trip,
 * not the query. Every action below resolves in exactly one statement; adding a
 * second one doubles the latency the user feels, and running two in parallel is
 * worse still because the second needs its own TLS connection.
 */
const OPEN_TODAY_CTE = (userId: string) => sql`
  tz as (
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
  ),
  day as (
    select day_index from ins union all select day_index from existing limit 1
  )
`;

/**
 * Records how a problem actually went.
 *
 * This is the rule the whole app exists to enforce: opening the editorial means
 * the problem is NOT done, so it comes back automatically. You never maintain
 * redo.md — it maintains itself.
 */
export async function recordOutcome(input: {
  problemSlug: string;
  outcome: string;
  minutes?: number;
}) {
  const userId = await requireUser();
  const outcome = outcomeSchema.parse(input.outcome);
  const slug = slugSchema.parse(input.problemSlug);
  const minutes = input.minutes ?? null;
  const needsRedo = outcome === "editorial" || outcome === "failed";

  const res = await db.execute<{
    day_index: number;
    redo_due_day: number | null;
    unit_slug: string | null;
  }>(sql`
    with ${OPEN_TODAY_CTE(userId)},
    prob as (
      select slug, unit_slug from problems where slug = ${slug}
    ),
    cleared as (
      update problem_attempts set redo_cleared_at = now()
      where user_id = ${userId} and problem_slug = ${slug} and redo_cleared_at is null
      returning 1
    ),
    attempt as (
      insert into problem_attempts
        (user_id, problem_slug, outcome, minutes, day_index, redo_due_day, redo_cleared_at)
      select
        ${userId}, p.slug, ${outcome}, ${minutes}, d.day_index,
        ${needsRedo ? sql`d.day_index + ${REDO_DELAY_DAYS}` : sql`null`},
        ${needsRedo ? sql`null` : sql`now()`}
      from prob p, day d
      returning day_index, redo_due_day
    )
    select a.day_index, a.redo_due_day, p.unit_slug from attempt a, prob p
  `);

  const row = res.rows[0];
  if (!row) throw new Error("unknown problem");

  if (row.unit_slug) revalidatePath(`/unit/${row.unit_slug}`);
  revalidatePath("/today");
  return {
    dayIndex: Number(row.day_index),
    redoDueDay: row.redo_due_day == null ? null : Number(row.redo_due_day),
  };
}

/**
 * Reveals the trigger -> approach hint. Recorded deliberately: a problem you
 * needed the hint for is a different data point from one you did not.
 */
export async function revealHint(problemSlug: string) {
  const userId = await requireUser();
  const slug = slugSchema.parse(problemSlug);

  const [latest] = await db
    .select({ id: problemAttempts.id })
    .from(problemAttempts)
    .where(sql`${problemAttempts.userId} = ${userId} and ${problemAttempts.problemSlug} = ${slug}`)
    .orderBy(desc(problemAttempts.id))
    .limit(1);

  if (latest) {
    await db
      .update(problemAttempts)
      .set({ hintRevealed: true })
      .where(eq(problemAttempts.id, latest.id));
    return { ok: true };
  }

  // no attempt logged yet — record the reveal so the eventual outcome carries it
  await db.execute(sql`
    with ${OPEN_TODAY_CTE(userId)}
    insert into problem_attempts
      (user_id, problem_slug, outcome, day_index, hint_revealed, redo_cleared_at)
    select ${userId}, ${slug}, 'hinted', d.day_index, true, now() from day d
  `);
  return { ok: true };
}

/**
 * Marks a unit done (or reopens it). Completion is the unit of progress on the
 * trail — and the moment its recall cards enter the deck.
 *
 * The seeding happens here rather than in a background job because it must be
 * atomic with the completion: a unit that reads as done but whose cards never
 * arrived is a silent hole in the review surface, and nothing would ever
 * notice it. The insert is a sibling CTE, so this is still one round trip.
 *
 * Reopening a unit deliberately does NOT remove its cards. You read the
 * material; the cards are yours now, and un-ticking a checkbox is not evidence
 * that you forgot it. Deleting them would also discard their whole review
 * history, which is the expensive part.
 */
export async function setUnitState(unitSlug: string, done: boolean) {
  const userId = await requireUser();
  const slug = slugSchema.parse(unitSlug);

  const res = await db.execute<{ day_index: number; seeded: number }>(sql`
    with ${OPEN_TODAY_CTE(userId)},
    u as (select slug, recall from units where slug = ${slug}),
    up as (
      insert into unit_progress (user_id, unit_slug, state, completed_on_day_index, updated_at)
      select
        ${userId}, u.slug, ${done ? "done" : "in_progress"},
        ${done ? sql`d.day_index` : sql`null`}, now()
      from u, day d
      on conflict (user_id, unit_slug) do update set
        state = excluded.state,
        completed_on_day_index = excluded.completed_on_day_index,
        updated_at = excluded.updated_at
      returning completed_on_day_index
    ),
    cards as (
      insert into flashcards (user_id, unit_slug, front, back, due_day_index)
      select ${userId}, u.slug, c->>'front', c->>'back', d.day_index + 1
      from u, day d, jsonb_array_elements(u.recall) c
      where ${done}
      -- the unique (user, front) index makes re-completing a unit a no-op
      -- rather than a second copy of every card
      on conflict do nothing
      returning 1
    )
    select d.day_index, (select count(*)::int from cards) as seeded from day d, up
  `);

  if (!res.rows[0]) throw new Error("unknown unit");

  revalidatePath(`/unit/${slug}`);
  revalidatePath("/roadmap");
  revalidatePath("/today");
  revalidatePath("/review");
  return {
    done,
    dayIndex: Number(res.rows[0].day_index),
    cardsSeeded: Number(res.rows[0].seeded ?? 0),
  };
}
