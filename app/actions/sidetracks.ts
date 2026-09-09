"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { optionalSafeUrlSchema } from "@/lib/safe-url";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/**
 * The current day_index without opening a day.
 *
 * Logging a score should not silently start a journey day for you — that has to
 * stay something you do deliberately by working. So this reads, never writes.
 */
const CURRENT_DAY = (userId: string) => sql`
  coalesce((select max(day_index) from journey_days where user_id = ${userId}), 1)
`;

/* ------------------------------------------------------------------ *
 * aptitude
 * ------------------------------------------------------------------ */

const aptitudeSchema = z.object({
  topic: z.string().min(1).max(80),
  correct: z.coerce.number().int().min(0).max(200),
  total: z.coerce.number().int().min(1).max(200),
  minutes: z.coerce.number().int().min(0).max(600).optional(),
});

/** Records one timed drill. The score is the point — an unlogged drill did not happen. */
export async function logAptitude(input: z.input<typeof aptitudeSchema>) {
  const userId = await requireUser();
  const v = aptitudeSchema.parse(input);
  if (v.correct > v.total) throw new Error("correct cannot exceed total");

  const res = await db.execute<{ day_index: number }>(sql`
    insert into aptitude_scores (user_id, day_index, topic, correct, total, minutes)
    values (${userId}, ${CURRENT_DAY(userId)}, ${v.topic}, ${v.correct}, ${v.total},
            ${v.minutes ?? null})
    returning day_index
  `);
  revalidatePath("/metrics");
  revalidatePath("/today");
  return { dayIndex: Number(res.rows[0]!.day_index), percent: Math.round((v.correct / v.total) * 100) };
}

/* ------------------------------------------------------------------ *
 * mocks
 * ------------------------------------------------------------------ */

const mockSchema = z.object({
  kind: z.enum(["dsa_pair", "tech_mcq", "coding_round", "full_mock", "hr", "system_design"]),
  score: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  recordingUrl: optionalSafeUrlSchema,
});

/** Logs a session against this journey week's quota. */
export async function logMock(input: z.input<typeof mockSchema>) {
  const userId = await requireUser();
  const v = mockSchema.parse(input);

  const res = await db.execute<{ day_index: number; journey_week: number }>(sql`
    with d as (select ${CURRENT_DAY(userId)} as day_index)
    insert into mock_sessions
      (user_id, kind, journey_week, day_index, score, notes, recording_url)
    select ${userId}, ${v.kind}, ceil(d.day_index / 7.0)::int, d.day_index,
           ${v.score || null}, ${v.notes || null}, ${v.recordingUrl || null}
    from d
    returning day_index, journey_week
  `);
  revalidatePath("/career");
  revalidatePath("/metrics");
  const row = res.rows[0]!;
  return { dayIndex: Number(row.day_index), journeyWeek: Number(row.journey_week) };
}

/* ------------------------------------------------------------------ *
 * applications
 * ------------------------------------------------------------------ */

const appSchema = z.object({
  company: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  source: z.string().max(60).default("direct"),
  link: z.string().max(500).optional(),
});

export async function addApplication(input: z.input<typeof appSchema>) {
  const userId = await requireUser();
  const v = appSchema.parse(input);

  const res = await db.execute<{ id: number; journey_week: number }>(sql`
    with d as (select ${CURRENT_DAY(userId)} as day_index)
    insert into applications (user_id, company, role, source, journey_week, link)
    select ${userId}, ${v.company}, ${v.role}, ${v.source || "direct"},
           ceil(d.day_index / 7.0)::int, ${v.link || null}
    from d
    returning id, journey_week
  `);
  revalidatePath("/career");
  revalidatePath("/metrics");
  const row = res.rows[0]!;
  return { id: Number(row.id), journeyWeek: Number(row.journey_week) };
}

const statusSchema = z.enum([
  "applied", "responded", "screening", "interviewing", "offer", "rejected", "ghosted",
]);

export async function setApplicationStatus(id: number, status: string) {
  const userId = await requireUser();
  const s = statusSchema.parse(status);
  await db.execute(sql`
    update applications set status = ${s}
    where id = ${z.coerce.number().int().parse(id)} and user_id = ${userId}
  `);
  revalidatePath("/career");
  revalidatePath("/metrics");
  return { status: s };
}

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().max(120).optional(),
  channel: z.string().max(40).default("linkedin"),
});

export async function addContact(input: z.input<typeof contactSchema>) {
  const userId = await requireUser();
  const v = contactSchema.parse(input);
  await db.execute(sql`
    with d as (select ${CURRENT_DAY(userId)} as day_index)
    insert into contacts (user_id, name, company, channel, last_touch_week)
    select ${userId}, ${v.name}, ${v.company || null}, ${v.channel || "linkedin"},
           ceil(d.day_index / 7.0)::int
    from d
  `);
  revalidatePath("/career");
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * STAR stories
 * ------------------------------------------------------------------ */

const storySchema = z.object({
  prompt: z.string().min(1).max(300),
  situation: z.string().max(2000).default(""),
  task: z.string().max(2000).default(""),
  action: z.string().max(2000).default(""),
  result: z.string().max(2000).default(""),
});

/** Upserts by prompt — the prompts are a fixed set, so one story per question. */
export async function saveStory(input: z.input<typeof storySchema>) {
  const userId = await requireUser();
  const v = storySchema.parse(input);
  // update-or-insert in one statement: the prompts are a fixed set, so there is
  // one story per question, and there is no unique index to lean on
  await db.execute(sql`
    with upd as (
      update star_stories set situation = ${v.situation ?? ""}, task = ${v.task ?? ""},
        action = ${v.action ?? ""}, result = ${v.result ?? ""}, updated_at = now()
      where user_id = ${userId} and prompt = ${v.prompt}
      returning id
    )
    insert into star_stories (user_id, prompt, situation, task, action, result, updated_at)
    select ${userId}, ${v.prompt}, ${v.situation ?? ""}, ${v.task ?? ""}, ${v.action ?? ""},
           ${v.result ?? ""}, now()
    where not exists (select 1 from upd)
  `);
  revalidatePath("/career");
  revalidatePath("/metrics");
  return { ok: true };
}

/** Rehearsing out loud is the thing that works, so it is counted separately. */
export async function rehearseStory(prompt: string) {
  const userId = await requireUser();
  const p = z.string().min(1).max(300).parse(prompt);
  const res = await db.execute<{ rehearsed_count: number }>(sql`
    update star_stories set rehearsed_count = rehearsed_count + 1, updated_at = now()
    where user_id = ${userId} and prompt = ${p}
    returning rehearsed_count
  `);
  revalidatePath("/career");
  return { rehearsedCount: res.rows[0] ? Number(res.rows[0].rehearsed_count) : 0 };
}

/* ------------------------------------------------------------------ *
 * projects
 * ------------------------------------------------------------------ */

/**
 * Ticks a deliverable against its definition of done.
 *
 * Evidence is optional but asked for every time, because "done" without a link
 * is the same self-report that let the old roadmap drift.
 */
export async function setDeliverable(slug: string, done: boolean, evidenceUrl?: string) {
  const userId = await requireUser();
  const s = z.string().min(1).max(200).parse(slug);
  const evidence = optionalSafeUrlSchema.parse(evidenceUrl) ?? null;

  if (!done) {
    await db.execute(sql`
      delete from deliverable_done where user_id = ${userId} and deliverable_slug = ${s}
    `);
    revalidatePath("/projects");
    revalidatePath("/metrics");
    return { done: false, dayIndex: null };
  }

  const res = await db.execute<{ day_index: number }>(sql`
    with d as (select ${CURRENT_DAY(userId)} as day_index)
    insert into deliverable_done (user_id, deliverable_slug, day_index, evidence_url)
    select ${userId}, ${s}, d.day_index, ${evidence} from d
    on conflict (user_id, deliverable_slug) do update
      set evidence_url = coalesce(excluded.evidence_url, deliverable_done.evidence_url)
    returning day_index
  `);
  revalidatePath("/projects");
  revalidatePath("/metrics");
  revalidatePath("/today");
  return { done: true, dayIndex: Number(res.rows[0]!.day_index) };
}

/**
 * The no-AI-codegen pledge.
 *
 * Cairn was built by an AI and is therefore not one of these projects. These
 * three are the ones an interviewer will ask you to explain line by line, and
 * the pledge is what makes that survivable.
 */
export async function acceptPledge(projectSlug: string, repoUrl?: string) {
  const userId = await requireUser();
  const s = z.string().min(1).max(120).parse(projectSlug);
  const repo = optionalSafeUrlSchema.parse(repoUrl) ?? null;
  await db.execute(sql`
    insert into user_projects (user_id, project_slug, repo_url, pledge_accepted_at)
    values (${userId}, ${s}, ${repo}, now())
    on conflict (user_id, project_slug) do update set
      repo_url = coalesce(excluded.repo_url, user_projects.repo_url),
      pledge_accepted_at = coalesce(user_projects.pledge_accepted_at, excluded.pledge_accepted_at)
  `);
  revalidatePath("/projects");
  return { ok: true };
}

export async function setRepoUrl(projectSlug: string, repoUrl: string) {
  const userId = await requireUser();
  const s = z.string().min(1).max(120).parse(projectSlug);
  const repo = optionalSafeUrlSchema.parse(repoUrl) ?? null;
  await db.execute(sql`
    insert into user_projects (user_id, project_slug, repo_url)
    values (${userId}, ${s}, ${repo})
    on conflict (user_id, project_slug) do update set repo_url = excluded.repo_url
  `);
  revalidatePath("/projects");
  return { ok: true };
}
