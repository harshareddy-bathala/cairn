"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { openTodayCte, retryUnopened } from "@/lib/open-today";
import { recordAttempt, revealHintFor } from "@/lib/progress";
import { ROUTES } from "@/lib/routes";

const outcomeSchema = z.enum(["clean", "hinted", "editorial", "failed"]);
const slugSchema = z.string().min(1).max(200);
/** a self-reported time on one problem — ten hours is already not a problem, it is a day */
const minutesSchema = z.number().int().min(0).max(600).nullable();

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/*
 * The database is ~270ms away, so the unit of design here is the round trip,
 * not the query. Every action below resolves in exactly one statement, with
 * opening today inlined as a CTE (lib/open-today.ts); adding a second one
 * doubles the latency the user feels, and running two in parallel is worse
 * still because the second needs its own TLS connection.
 */

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
  const claimed = outcomeSchema.parse(input.outcome);
  const slug = slugSchema.parse(input.problemSlug);
  const minutes = minutesSchema.parse(input.minutes ?? null);

  const row = await recordAttempt(userId, slug, claimed, minutes);
  if (!row) throw new Error("unknown problem");

  if (row.unitSlug) revalidatePath(`/unit/${row.unitSlug}`);
  revalidatePath(ROUTES.today);
  return { dayIndex: row.dayIndex, redoDueDay: row.redoDueDay, outcome: row.outcome };
}

/**
 * Reveals the trigger -> approach hint. Recorded deliberately: a problem you
 * needed the hint for is a different data point from one you did not.
 * See `revealHintFor` for why a reveal is not an attempt.
 */
export async function revealHint(problemSlug: string) {
  const userId = await requireUser();
  await revealHintFor(userId, slugSchema.parse(problemSlug));
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

  const run = () => db.execute<{ day_index: number; seeded: number }>(sql`
    with ${openTodayCte(userId)},
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

  const res = await retryUnopened(run, (r) => r.rows.length > 0);
  if (!res.rows[0]) throw new Error("unknown unit");

  revalidatePath(`/unit/${slug}`);
  revalidatePath(ROUTES.trail);
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.review);
  return {
    done,
    dayIndex: Number(res.rows[0].day_index),
    cardsSeeded: Number(res.rows[0].seeded ?? 0),
  };
}
