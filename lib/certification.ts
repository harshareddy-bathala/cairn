import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questionsForModule } from "@/content/checkpoints";
import { EXAM_UNLOCK } from "@/content/checkpoints";
import { phases } from "@/content/phases";

/**
 * The certification spine: module checkpoints, then a phase exam, then a
 * certificate.
 *
 * The exam gates the *certificate*, not your progress. A phase opens at 80% of
 * the previous phase's units regardless of how the exam went, because a bad
 * week on a quiz should never be able to wall you off from the curriculum.
 */

export type ModuleCheckpoint = {
  moduleSlug: string;
  moduleTitle: string;
  phaseSlug: string;
  questionCount: number;
  unitsDone: number;
  unitsTotal: number;
  bestScore: number | null;
  bestTotal: number | null;
  passed: boolean;
  attempts: number;
};

export type PhaseStanding = {
  phaseSlug: string;
  title: string;
  unitsDone: number;
  unitsTotal: number;
  checkpointsPassed: number;
  checkpointsTotal: number;
  examUnlocked: boolean;
  bestExam: { score: number; total: number; passed: boolean } | null;
  hasDefense: boolean;
  certificateId: string | null;
};

export async function getCertificationState(userId: string) {
  const res = await db.execute<{ data: RawCert }>(sql`
    select json_build_object(
      'modules', coalesce((
        select json_agg(json_build_object(
          'moduleSlug', m.slug, 'moduleTitle', m.title, 'phaseSlug', m.phase_slug,
          'unitsTotal', (select count(*)::int from units u where u.module_slug = m.slug),
          'unitsDone', (
            select count(*)::int from units u
            join unit_progress up on up.unit_slug = u.slug
            where u.module_slug = m.slug and up.user_id = ${userId} and up.state = 'done'
          ),
          'bestScore', (
            select max(score) from checkpoint_attempts
            where user_id = ${userId} and module_slug = m.slug
          ),
          'bestTotal', (
            select max(total) from checkpoint_attempts
            where user_id = ${userId} and module_slug = m.slug
          ),
          'passed', exists (
            select 1 from checkpoint_attempts
            where user_id = ${userId} and module_slug = m.slug and passed
          ),
          'attempts', (
            select count(*)::int from checkpoint_attempts
            where user_id = ${userId} and module_slug = m.slug
          )
        ) order by (select ph."order" from phases ph where ph.slug = m.phase_slug), m."order")
        from modules m
      ), '[]'::json),
      'exams', coalesce((
        select json_agg(json_build_object(
          'phaseSlug', phase_slug, 'score', score, 'total', total, 'passed', passed,
          'defense', defense_recording_url is not null
        ) order by id desc)
        from exam_attempts where user_id = ${userId}
      ), '[]'::json),
      'certificates', coalesce((
        select json_agg(json_build_object('id', id, 'phaseSlug', phase_slug))
        from certificates where user_id = ${userId}
      ), '[]'::json)
    ) as data
  `);
  return res.rows[0]!.data;
}

type RawCert = {
  modules: (Omit<ModuleCheckpoint, "questionCount"> & { bestScore: number | null })[];
  exams: { phaseSlug: string; score: number; total: number; passed: boolean; defense: boolean }[];
  certificates: { id: string; phaseSlug: string }[];
};

export function shapeCertification(raw: RawCert) {
  const modules: ModuleCheckpoint[] = raw.modules.map((m) => ({
    ...m,
    questionCount: questionsForModule(m.moduleSlug).length,
  }));

  const standings: PhaseStanding[] = phases.map((ph) => {
    const mine = modules.filter((m) => m.phaseSlug === ph.slug);
    const unitsDone = mine.reduce((n, m) => n + m.unitsDone, 0);
    const unitsTotal = mine.reduce((n, m) => n + m.unitsTotal, 0);
    const exams = raw.exams.filter((e) => e.phaseSlug === ph.slug);
    const best = exams.length
      ? exams.reduce((a, b) => (b.score / b.total > a.score / a.total ? b : a))
      : null;
    return {
      phaseSlug: ph.slug,
      title: ph.title,
      unitsDone,
      unitsTotal,
      checkpointsPassed: mine.filter((m) => m.passed).length,
      checkpointsTotal: mine.length,
      // 80% of the phase's units — not all of them, and never gated on the quiz
      examUnlocked: unitsTotal > 0 && unitsDone / unitsTotal >= EXAM_UNLOCK,
      bestExam: best ? { score: best.score, total: best.total, passed: best.passed } : null,
      hasDefense: exams.some((e) => e.defense),
      certificateId: raw.certificates.find((c) => c.phaseSlug === ph.slug)?.id ?? null,
    };
  });

  return { modules, standings };
}

/**
 * Whether a phase's exam is open to this person — the same 80%-of-units rule
 * the page shows, checked again wherever a paper is drawn or graded, because a
 * rule that lives only on the page is a suggestion to anyone with devtools.
 */
export async function examUnlocked(userId: string, phaseSlug: string) {
  const res = await db.execute<{ done: number; total: number }>(sql`
    select
      (select count(*)::int from unit_progress up
        join units u on u.slug = up.unit_slug
        join modules m on m.slug = u.module_slug
        where up.user_id = ${userId} and up.state = 'done' and m.phase_slug = ${phaseSlug}) as done,
      (select count(*)::int from units u
        join modules m on m.slug = u.module_slug
        where m.phase_slug = ${phaseSlug}) as total
  `);
  const r = res.rows[0];
  const total = Number(r?.total ?? 0);
  return total > 0 && Number(r?.done ?? 0) / total >= EXAM_UNLOCK;
}
