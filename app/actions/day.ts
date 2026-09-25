"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { generatePlan, getDayContext, planInputFrom } from "@/lib/planner";
import { ROUTES } from "@/lib/routes";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

const multiplierSchema = z.union([z.literal(1), z.literal(1.5), z.literal(2)]);

/** rebuilds today's plan from the current context, at the given mode and pace */
async function regenerate(userId: string, over: { mode?: "normal" | "bad_day"; multiplier?: number }) {
  const ctx = await getDayContext(userId);
  const nextMode = over.mode ?? ctx.mode;
  const nextMultiplier = over.multiplier ?? ctx.multiplier;
  // a day past 1x is a catch-up day; the stone is coloured differently for it
  const resolvedMode = nextMode !== "bad_day" && nextMultiplier > 1 ? "catchup" : nextMode;

  const plan = generatePlan(
    planInputFrom(ctx, { mode: resolvedMode, multiplier: nextMultiplier }),
  );

  await db.execute(sql`
    update journey_days
    set mode = ${resolvedMode}, multiplier = ${nextMultiplier}, plan = ${JSON.stringify(plan)}::jsonb
    where user_id = ${userId} and day_index = ${ctx.dayIndex}
  `);
  revalidatePath(ROUTES.today);
  return { dayIndex: ctx.dayIndex, mode: resolvedMode, multiplier: nextMultiplier };
}

/**
 * Catch-up. One strong Saturday should genuinely erase two skipped days, so at
 * 2x the generator pulls the next unit in each track as well as doubling the
 * budget. This is the explicit fix for "if I fall behind I want to do 1-2 days
 * of content in one day".
 */
export async function setCatchup(multiplier: number) {
  const userId = await requireUser();
  const m = multiplierSchema.parse(multiplier);
  await db.execute(sql`update users set catchup_mode = ${m} where id = ${userId}`);
  return regenerate(userId, { multiplier: m, mode: "normal" });
}

/**
 * Bad day. Collapses today to one problem and the log — rule 5 of the user's own
 * seven rules, encoded. The streak survives, because a day you showed up for at
 * all is not a day you missed.
 */
export async function setBadDay(on: boolean) {
  const userId = await requireUser();
  return regenerate(userId, { mode: on ? "bad_day" : "normal", multiplier: on ? 1 : undefined });
}

/**
 * Ticks a block that has no natural completion signal (the aptitude drill).
 *
 * Only a block that is actually on today's plan can be ticked — the id is
 * checked against the stored plan's blocks, so `ticked` cannot fill up with
 * whatever strings a request cares to send.
 */
export async function tickBlock(blockId: string, done: boolean) {
  const userId = await requireUser();
  const id = z.string().min(1).max(200).parse(blockId);
  const on = z.boolean().parse(done);

  const res = await db.execute<{ day_index: number }>(sql`
    with d as (
      select day_index, plan from journey_days
      where user_id = ${userId} order by day_index desc limit 1
    ),
    upd as (
      update journey_days j set plan = jsonb_set(
        d.plan,
        '{ticked}',
        case when ${on}
          then (coalesce(d.plan->'ticked', '[]'::jsonb) - ${id}) || to_jsonb(array[${id}])
          else coalesce(d.plan->'ticked', '[]'::jsonb) - ${id}
        end
      )
      from d
      where j.user_id = ${userId} and j.day_index = d.day_index and d.plan is not null
        and exists (
          select 1 from jsonb_array_elements(d.plan->'blocks') b where b->>'id' = ${id}
        )
      returning j.day_index
    )
    select day_index from upd
  `);

  revalidatePath(ROUTES.today);
  return { done: on, dayIndex: res.rows[0] ? Number(res.rows[0].day_index) : null };
}

const closeSchema = z.object({
  learned: z.string().max(2000).optional(),
  tomorrowFirstTask: z.string().max(300).optional(),
  minutes: z.coerce.number().int().min(0).max(1440).optional(),
});

/**
 * Closes the day. This is the only thing that advances the streak, and it is the
 * accountability the roadmap was missing: the day does not count until you say
 * what you learned and what you will open first tomorrow.
 *
 * "What you learned" is required — here, not only in the form. A day closed
 * with nothing written is a stone with nothing under it. A day reopened keeps
 * the sentence it was closed with, so closing it again needs nothing new.
 *
 * Returns the new stone count so the cairn can be animated.
 */
export async function closeDay(
  input: z.input<typeof closeSchema>,
): Promise<{ ok: true; dayIndex: number; stones: number } | { ok: false; error: string }> {
  const userId = await requireUser();
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some of that could not be saved — check the fields." };
  const v = parsed.data;
  const learned = v.learned?.trim() || null;

  const res = await db.execute<{ day_index: number | null; closed: boolean; stones: number }>(sql`
    with d as (
      select day_index, closed_at is not null as was_closed from journey_days
      where user_id = ${userId} order by day_index desc limit 1
    ),
    upd as (
      update journey_days j set
        closed_at = coalesce(j.closed_at, now()),
        learned_md = coalesce(${learned}, j.learned_md),
        tomorrow_first_task = coalesce(${v.tomorrowFirstTask ?? null}, j.tomorrow_first_task),
        minutes_total = coalesce(${v.minutes ?? null}, j.minutes_total)
      from d
      where j.user_id = ${userId} and j.day_index = d.day_index
        and coalesce(${learned}, nullif(trim(j.learned_md), '')) is not null
      -- RETURNING sees the row after the update, where closed_at is always set;
      -- whether the day was already closed has to come from the snapshot in d
      returning j.day_index, d.was_closed
    )
    select (select day_index from d) as day_index,
      exists (select 1 from upd) as closed,
      -- the statement cannot see its own update, so today's stone is added here
      (select count(*)::int from journey_days
        where user_id = ${userId} and closed_at is not null)
        + (select count(*)::int from upd where not was_closed) as stones
  `);

  const row = res.rows[0];
  if (row?.day_index == null) return { ok: false, error: "There is no open day to close." };
  if (!row.closed) return { ok: false, error: "Write one thing you learned — the day does not count until you do." };

  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.trail);
  return { ok: true, dayIndex: Number(row.day_index), stones: Number(row.stones) };
}

/** reopens the day — closing early by accident should not cost you the evening */
export async function reopenDay() {
  const userId = await requireUser();
  await db.execute(sql`
    with d as (
      select day_index from journey_days where user_id = ${userId}
      order by day_index desc limit 1
    )
    update journey_days j set closed_at = null
    from d where j.user_id = ${userId} and j.day_index = d.day_index
  `);
  revalidatePath(ROUTES.today);
  return { ok: true };
}
