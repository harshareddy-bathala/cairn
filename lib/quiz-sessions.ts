import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import type { QuizKind } from "@/db/schema";
import { modules as contentModules } from "@/content";
import { questionsForModule, CHECKPOINT_PASS, EXAM_PASS, EXAM_UNLOCK } from "@/content/checkpoints";
import { examUnlocked } from "@/lib/certification";
import {
  DEADLINE_GRACE_MS,
  drawCheckpoint,
  drawExam,
  examMinutes,
  grade,
  keyFor,
  newSeed,
  paperFrom,
  present,
  type PaperQuestion,
} from "@/lib/quiz-paper";

/**
 * Sittings: a checkpoint or an exam, drawn, held and graded on the server.
 *
 * The rules live here rather than in the server actions so verify can hold
 * them to account without a browser: a locked exam is refused, a sitting is
 * graded once, a late exam is spent, and a failed paper never carries its key.
 * The actions in app/actions/certification.ts add the session and revalidation.
 */

export type Refusal = { ok: false; error: string };
const refuse = (error: string): Refusal => ({ ok: false, error });

const CURRENT_DAY = (userId: string) => sql`
  coalesce((select max(day_index) from journey_days where user_id = ${userId}), 1)
`;

const kindSchema = z.enum(["checkpoint", "exam"]);

/** a paper as the browser receives it: display order, no key, the server's clock */
export type Paper = {
  ok: true;
  sessionId: string;
  kind: QuizKind;
  questions: PaperQuestion[];
  /** epoch ms; null for an untimed checkpoint */
  deadlineAt: number | null;
  /** the server's now, so the tab can correct for its own clock */
  serverNow: number;
};

export type QuizGrade = {
  ok: true;
  score: number;
  total: number;
  passed: boolean;
  /**
   * Question id -> correct option in display order, with the explanations.
   * Only after a pass: a failed paper that hands back its key turns the retake
   * into transcription.
   */
  key?: Record<string, number>;
  why?: Record<string, string>;
  /** a failed checkpoint: which ones were wrong, not what was right */
  wrong?: string[];
  /** a failed exam: where the marks went, module by module */
  byModule?: { title: string; score: number; total: number }[];
};

const titles = new Map(contentModules.map((m) => [m.slug, m.title]));
const phaseModules = (phaseSlug: string) =>
  contentModules.filter((m) => m.phaseSlug === phaseSlug).map((m) => m.slug);

/**
 * Sits down to a checkpoint or an exam, and returns the paper.
 *
 * An unsubmitted sitting that is still inside its clock is resumed, so a
 * reload hands back the same paper with the time it has left. Otherwise a new
 * sitting is drawn with a fresh seed — new questions for an exam, a new order
 * and new option positions for a checkpoint.
 */
export async function startSitting(
  userId: string,
  kind: QuizKind,
  subjectSlug: string,
): Promise<Paper | Refusal> {
  const k = kindSchema.parse(kind);
  const slug = z.string().min(1).max(200).parse(subjectSlug);

  if (k === "checkpoint" && questionsForModule(slug).length === 0)
    return refuse("There is no checkpoint for this module.");
  if (k === "exam") {
    if (phaseModules(slug).length === 0) return refuse("There is no exam for this phase yet.");
    if (!(await examUnlocked(userId, slug)))
      return refuse(`The exam opens at ${Math.round(EXAM_UNLOCK * 100)}% of the phase's units.`);
  }

  // Times are plain `timestamp` columns, which a raw query hands back as local
  // time — five and a half hours out in IST. So the database reports how much
  // of the clock is left, in its own frame, and the deadline is rebuilt here.
  const open = await db.execute<SessionRow>(sql`
    select id, seed, question_ids, ${REMAINING_MS} from quiz_sessions
    where user_id = ${userId} and kind = ${k} and subject_slug = ${slug}
      and submitted_at is null and (deadline_at is null or deadline_at > localtimestamp)
    order by started_at desc limit 1
  `);

  let row = open.rows[0];
  if (!row) {
    const seed = newSeed();
    const drawn = k === "exam" ? drawExam(phaseModules(slug), seed) : drawCheckpoint(slug, seed);
    const minutes = k === "exam" ? examMinutes(drawn.length) : null;
    const created = await db.execute<SessionRow>(sql`
      insert into quiz_sessions (id, user_id, kind, subject_slug, seed, question_ids, deadline_at)
      values (${crypto.randomUUID()}, ${userId}, ${k}, ${slug}, ${seed},
              ${JSON.stringify(drawn.map((q) => q.id))}::jsonb,
              ${minutes == null ? null : sql`localtimestamp + make_interval(mins => ${minutes})`})
      returning id, seed, question_ids, ${REMAINING_MS}
    `);
    row = created.rows[0]!;
  }

  const seed = Number(row.seed);
  const now = Date.now();
  return {
    ok: true,
    sessionId: row.id,
    kind: k,
    questions: paperFrom(row.question_ids).map((q) => present(q, seed)),
    deadlineAt: row.remaining_ms == null ? null : now + Number(row.remaining_ms),
    serverNow: now,
  };
}

const REMAINING_MS = sql`(extract(epoch from deadline_at - localtimestamp) * 1000)::bigint as remaining_ms`;

type SessionRow = {
  id: string;
  seed: number;
  question_ids: string[];
  remaining_ms: string | number | null;
};

/**
 * Grades a sitting. Grading happens here, never in the browser: the paper is
 * read back from the session rather than taken from the request, the session
 * is claimed so it can be submitted exactly once, and an exam past its clock
 * (plus a little grace for the auto-submit in flight) is refused.
 */
export async function submitSitting(
  userId: string,
  sessionId: string,
  given: Record<string, number>,
): Promise<(QuizGrade & { kind: QuizKind; subjectSlug: string }) | Refusal> {
  const idParsed = z.uuid().safeParse(sessionId);
  if (!idParsed.success) return refuse("That paper does not exist. Begin a new one.");
  const id = idParsed.data;
  const shape = z.record(z.string().max(60), z.number().int().min(0).max(3));
  const parsed = shape.safeParse(given);
  if (!parsed.success || Object.keys(parsed.data).length > 40)
    return refuse("Those answers could not be read. Reload the page and begin again.");

  return db.transaction(async (tx) => {
    const claimed = await tx.execute<{
      kind: QuizKind;
      subject_slug: string;
      seed: number;
      question_ids: string[];
      late: boolean;
    }>(sql`
      update quiz_sessions set submitted_at = now()
      where id = ${id} and user_id = ${userId} and submitted_at is null
      returning kind, subject_slug, seed, question_ids,
        coalesce(deadline_at + make_interval(secs => ${DEADLINE_GRACE_MS / 1000}) < localtimestamp, false) as late
    `);
    const s = claimed.rows[0];
    if (!s) return refuse("This paper has already been submitted. Begin a new one to sit it again.");
    // the claim commits either way: a paper past its clock is spent, not reusable
    if (s.late) return refuse("The clock ran out on this paper before it arrived. Begin a new one.");

    const seed = Number(s.seed);
    const paper = paperFrom(s.question_ids);
    if (paper.length === 0) return refuse("This paper no longer exists. Begin a new one.");
    const onPaper = new Set(paper.map((q) => q.id));
    const answers = Object.fromEntries(Object.entries(parsed.data).filter(([q]) => onPaper.has(q)));
    const g = grade(paper, seed, answers);

    if (s.kind === "checkpoint") {
      const passed = g.score / g.total >= CHECKPOINT_PASS;
      await tx.execute(sql`
        insert into checkpoint_attempts
          (user_id, module_slug, score, total, passed, answers, day_index)
        values (${userId}, ${s.subject_slug}, ${g.score}, ${g.total}, ${passed},
                ${JSON.stringify(g.canonical)}::jsonb, ${CURRENT_DAY(userId)})
      `);
      const base = { ok: true as const, kind: s.kind, subjectSlug: s.subject_slug, score: g.score, total: g.total, passed };
      return passed ? { ...base, ...keyFor(paper, seed) } : { ...base, wrong: g.wrong };
    }

    // the unlock is re-checked at grading too: a session is not a lock bypass
    if (!(await examUnlocked(userId, s.subject_slug)))
      return refuse(`The exam opens at ${Math.round(EXAM_UNLOCK * 100)}% of the phase's units.`);
    const passed = g.score / g.total >= EXAM_PASS;
    await tx.execute(sql`
      insert into exam_attempts (user_id, phase_slug, score, total, passed, day_index)
      values (${userId}, ${s.subject_slug}, ${g.score}, ${g.total}, ${passed}, ${CURRENT_DAY(userId)})
    `);
    const base = { ok: true as const, kind: s.kind, subjectSlug: s.subject_slug, score: g.score, total: g.total, passed };
    return passed
      ? { ...base, ...keyFor(paper, seed) }
      : {
          ...base,
          byModule: g.byModule.map((m) => ({
            title: titles.get(m.moduleSlug) ?? m.moduleSlug,
            score: m.score,
            total: m.total,
          })),
        };
  });
}

