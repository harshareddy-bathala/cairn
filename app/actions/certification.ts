"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { CERT_CHECKPOINTS } from "@/content/checkpoints";
import { startSitting, submitSitting, type Paper, type QuizGrade } from "@/lib/quiz-sessions";
import type { QuizKind } from "@/db/schema";
import { safeUrlSchema } from "@/lib/safe-url";
import { dsaSolvedSql } from "@/lib/progress";
import { ROUTES } from "@/lib/routes";

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

/**
 * Sits down to a checkpoint or an exam and returns the paper — see
 * lib/quiz-sessions.ts for the rules a sitting is held to.
 */
export async function startQuiz(kind: QuizKind, subjectSlug: string): Promise<Paper | Refusal> {
  const userId = await requireUser();
  return startSitting(userId, kind, subjectSlug);
}

/** Grades a sitting, once. */
export async function submitQuiz(
  sessionId: string,
  given: Record<string, number>,
): Promise<QuizGrade | Refusal> {
  const userId = await requireUser();
  const r = await submitSitting(userId, sessionId, given);
  if (!r.ok) return r;
  const { kind, subjectSlug, ...graded } = r;
  if (kind === "checkpoint") {
    revalidatePath(`/module/${subjectSlug}`);
    revalidatePath(ROUTES.review);
  }
  revalidatePath(ROUTES.certification);
  return graded;
}

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
  revalidatePath(ROUTES.certification);
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
        'problemsSolved', ${dsaSolvedSql(userId)},
        'activeDays', (
          select count(*)::int from journey_days
          where user_id = ${userId} and closed_at is not null
        ),
        'name', (select coalesce(name, 'A candidate') from users where id = ${userId})
      ) as s
      from exam e
    ),
    -- certificates_user_phase_idx: a double click or a second tab gets the
    -- certificate that already exists, never a second one
    ins as (
      insert into certificates (id, user_id, phase_slug, snapshot)
      select ${newId}, ${userId}, ${slug}, snap.s from snap
      on conflict (user_id, phase_slug) do nothing
      returning id
    )
    select id from ins
    union all
    select id from certificates where user_id = ${userId} and phase_slug = ${slug}
    limit 1
  `);

  const row = res.rows[0];
  if (!row) return refuse("Pass the exam and attach a defense recording first.");

  revalidatePath(ROUTES.certification);
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
  revalidatePath(ROUTES.certification);
  revalidatePath(`/u/${h}`);
  return { ok: true, handle: h };
}
