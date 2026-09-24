"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { questionsForModule } from "@/content/checkpoints";
import { CERT_CHECKPOINTS, CHECKPOINT_PASS, EXAM_PASS } from "@/content/checkpoints";
import { examPaper, examSeed } from "@/lib/certification";
import { modules as contentModules } from "@/content";
import { safeUrlSchema } from "@/lib/safe-url";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/**
 * A refusal the person can act on is returned, not thrown.
 *
 * Next strips the message from anything thrown out of a server action in a
 * production build, so "that handle is taken" reached the browser as a generic
 * "An error occurred in the Server Components render" — and a Zod failure
 * reached it as a JSON dump in development. Only genuine faults still throw.
 */
type Refusal = { ok: false; error: string };
const refuse = (error: string): Refusal => ({ ok: false, error });

const answersSchema = z.record(z.string().max(60), z.number().int().min(0).max(3));

const CURRENT_DAY = (userId: string) => sql`
  coalesce((select max(day_index) from journey_days where user_id = ${userId}), 1)
`;

/**
 * Grades a module checkpoint.
 *
 * Grading happens here, never in the browser: the client is handed questions
 * with the answer key stripped, so the only way to score is to submit.
 */
export async function submitCheckpoint(moduleSlug: string, given: Record<string, number>) {
  const userId = await requireUser();
  const slug = z.string().min(1).max(200).parse(moduleSlug);
  const answers = answersSchema.parse(given);

  const qs = questionsForModule(slug);
  if (qs.length === 0) throw new Error("no checkpoint for this module");

  const score = qs.filter((q) => answers[q.id] === q.answer).length;
  const passed = score / qs.length >= CHECKPOINT_PASS;

  await db.execute(sql`
    insert into checkpoint_attempts
      (user_id, module_slug, score, total, passed, answers, day_index)
    values (${userId}, ${slug}, ${score}, ${qs.length}, ${passed},
            ${JSON.stringify(answers)}::jsonb, ${CURRENT_DAY(userId)})
  `);

  revalidatePath(`/module/${slug}`);
  revalidatePath("/certification");
  return {
    ok: true as const,
    score,
    total: qs.length,
    passed,
    key: Object.fromEntries(qs.map((q) => [q.id, q.answer])),
    why: Object.fromEntries(qs.map((q) => [q.id, q.why])),
  };
}

/**
 * Grades a phase exam against the same deterministic paper the page served.
 *
 * The seed still travels with the submission, but it is checked against the
 * one the page is drawn from rather than taken on trust — otherwise a crafted
 * request could be graded against any paper it liked.
 */
export async function submitExam(
  phaseSlug: string,
  seed: number,
  given: Record<string, number>,
): Promise<QuizGrade | Refusal> {
  const userId = await requireUser();
  const slug = z.string().min(1).max(120).parse(phaseSlug);
  const s = z.number().int().parse(seed);
  const answers = answersSchema.parse(given);

  const expected = examSeed(userId, slug);
  if (s !== expected) return refuse("This paper does not match your exam. Reload the page and submit again.");

  const moduleSlugs = contentModules.filter((m) => m.phaseSlug === slug).map((m) => m.slug);
  const qs = examPaper(slug, moduleSlugs, expected);
  if (qs.length === 0) throw new Error("no exam for this phase");

  const score = qs.filter((q) => answers[q.id] === q.answer).length;
  const passed = score / qs.length >= EXAM_PASS;

  await db.execute(sql`
    insert into exam_attempts (user_id, phase_slug, score, total, passed, day_index)
    values (${userId}, ${slug}, ${score}, ${qs.length}, ${passed}, ${CURRENT_DAY(userId)})
  `);

  revalidatePath("/certification");
  return {
    ok: true,
    score,
    total: qs.length,
    passed,
    key: Object.fromEntries(qs.map((q) => [q.id, q.answer])),
    why: Object.fromEntries(qs.map((q) => [q.id, q.why])),
  };
}

type QuizGrade = {
  ok: true;
  score: number;
  total: number;
  passed: boolean;
  key: Record<string, number>;
  why: Record<string, string>;
};

/**
 * Attaches the out-loud defense recording to your best passing attempt.
 *
 * A written quiz cannot tell whether you can explain the thing. The recording
 * is the part that can, which is why the certificate needs both.
 */
export async function attachDefense(phaseSlug: string, url: string): Promise<{ ok: true } | Refusal> {
  const userId = await requireUser();
  const slug = z.string().min(1).max(120).parse(phaseSlug);
  // the same scheme allowlist as every other typed link: `z.string().url()`
  // accepted `javascript:` and refused `youtu.be/x`, the exact wrong way round
  const parsed = safeUrlSchema.safeParse(url);
  if (!parsed.success) return refuse("That is not a link — paste the full URL of the recording.");
  const link = parsed.data;

  const res = await db.execute<{ id: number }>(sql`
    with best as (
      select id from exam_attempts
      where user_id = ${userId} and phase_slug = ${slug} and passed
      order by score::float / total desc, id desc limit 1
    )
    update exam_attempts e set defense_recording_url = ${link}
    from best where e.id = best.id
    returning e.id
  `);

  if (!res.rows[0]) return refuse("Pass the exam first — the recording attaches to a passing attempt.");
  revalidatePath("/certification");
  return { ok: true };
}

/**
 * Issues the certificate.
 *
 * The snapshot is taken now and never recomputed — a certificate that silently
 * restated today's numbers would not be a record of anything.
 */
export async function issueCertificate(
  phaseSlug: string,
): Promise<{ ok: true; id: string } | Refusal> {
  const userId = await requireUser();
  const slug = z.string().min(1).max(120).parse(phaseSlug);
  // the id's default is a Drizzle $defaultFn, which raw SQL does not run
  const newId = crypto.randomUUID();

  // The exam says you can answer questions about the phase. The checkpoints say
  // you did that module by module, as you went. The certificate needs both.
  const gate = await db.execute<{ passed: number; total: number }>(sql`
    select
      (select count(distinct ca.module_slug)::int from checkpoint_attempts ca
        join modules m on m.slug = ca.module_slug
        where ca.user_id = ${userId} and ca.passed and m.phase_slug = ${slug}) as passed,
      (select count(*)::int from modules where phase_slug = ${slug}) as total
  `);
  const g = gate.rows[0]!;
  if (Number(g.total) > 0 && Number(g.passed) / Number(g.total) < CERT_CHECKPOINTS) {
    return refuse(
      `${g.passed}/${g.total} checkpoints passed — the certificate needs ${Math.ceil(Number(g.total) * CERT_CHECKPOINTS)}.`,
    );
  }

  const res = await db.execute<{ id: string }>(sql`
    with exam as (
      select score, total, day_index from exam_attempts
      where user_id = ${userId} and phase_slug = ${slug}
        and passed and defense_recording_url is not null
      order by score::float / total desc, id desc limit 1
    ),
    snap as (
      select json_build_object(
        'examScore', e.score, 'examTotal', e.total, 'dayIndex', e.day_index,
        'unitsDone', (
          select count(*)::int from unit_progress up
          join units u on u.slug = up.unit_slug
          join modules m on m.slug = u.module_slug
          where up.user_id = ${userId} and up.state = 'done' and m.phase_slug = ${slug}
        ),
        'unitsTotal', (
          select count(*)::int from units u
          join modules m on m.slug = u.module_slug where m.phase_slug = ${slug}
        ),
        'checkpointsPassed', (
          select count(distinct ca.module_slug)::int from checkpoint_attempts ca
          join modules m on m.slug = ca.module_slug
          where ca.user_id = ${userId} and ca.passed and m.phase_slug = ${slug}
        ),
        'problemsSolved', (
          select count(distinct problem_slug)::int from problem_attempts
          where user_id = ${userId} and outcome in ('clean', 'hinted')
        ),
        'activeDays', (
          select count(*)::int from journey_days
          where user_id = ${userId} and closed_at is not null
        ),
        'name', (select coalesce(name, 'A candidate') from users where id = ${userId})
      ) as s
      from exam e
    ),
    ins as (
      insert into certificates (id, user_id, phase_slug, snapshot)
      select ${newId}, ${userId}, ${slug}, snap.s from snap
      where not exists (
        select 1 from certificates where user_id = ${userId} and phase_slug = ${slug}
      )
      returning id
    )
    select id from ins
    union all
    select id from certificates where user_id = ${userId} and phase_slug = ${slug}
    limit 1
  `);

  const row = res.rows[0];
  if (!row) return refuse("Pass the exam and attach a defense recording first.");

  revalidatePath("/certification");
  revalidatePath(`/c/${row.id}`);
  return { ok: true, id: String(row.id) };
}

const handleSchema = z
  .string()
  .min(2)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes");

/** Claims the public handle that /u/[handle] resolves. */
export async function setHandle(handle: string): Promise<{ ok: true; handle: string } | Refusal> {
  const userId = await requireUser();
  const parsed = handleSchema.safeParse(handle.trim().toLowerCase());
  if (!parsed.success) {
    const n = handle.trim().length;
    return refuse(
      n < 2
        ? "At least two characters."
        : n > 30
          ? "Thirty characters at most."
          : "Lowercase letters, digits and dashes only, starting with a letter or digit.",
    );
  }
  const h = parsed.data;

  try {
    await db.execute(sql`update users set handle = ${h} where id = ${userId}`);
  } catch (e) {
    // only a unique violation means "taken"; anything else is a real fault
    const code = (e as { code?: string; cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (code === "23505") return refuse("That handle is taken.");
    throw e;
  }
  revalidatePath("/certification");
  revalidatePath(`/u/${h}`);
  return { ok: true, handle: h };
}
