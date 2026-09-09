"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/**
 * Banks work you had already done before Cairn existed.
 *
 * Marked with completed_on_day_index = 0 — day zero, before the trail started.
 * That keeps the distinction honest: these units count toward the map and the
 * phase exam, but they were not earned on a journey day, so they never inflate
 * your velocity or put a stone on the cairn.
 */
export async function bankUnits(unitSlugs: string[]) {
  const userId = await requireUser();
  const slugs = z
    .array(z.string().min(1).max(200).regex(/^[a-z0-9-]+$/))
    .max(500)
    .parse(unitSlugs);

  if (slugs.length === 0) {
    await db.execute(sql`
      update users set onboarded_at = now() where id = ${userId} and onboarded_at is null
    `);
    revalidatePath("/roadmap");
    return { banked: 0 };
  }

  const res = await db.execute<{ n: number }>(sql`
    -- one jsonb parameter: drizzle expands a JS array into separate
    -- placeholders, which Postgres reads as a record rather than an array
    with wanted as (select jsonb_array_elements_text(${JSON.stringify(slugs)}::jsonb) as slug),
    valid as (select u.slug from units u join wanted w on w.slug = u.slug),
    ins as (
      insert into unit_progress (user_id, unit_slug, state, completed_on_day_index, updated_at)
      select ${userId}, slug, 'done', 0, now() from valid
      on conflict (user_id, unit_slug) do update set
        state = 'done', completed_on_day_index = 0, updated_at = now()
      returning 1
    ),
    mark as (
      update users set onboarded_at = now() where id = ${userId} and onboarded_at is null
      returning 1
    )
    select count(*)::int as n from ins
  `);

  revalidatePath("/roadmap");
  revalidatePath("/today");
  revalidatePath("/certification");
  return { banked: Number(res.rows[0]?.n ?? 0) };
}
