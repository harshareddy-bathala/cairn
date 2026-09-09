import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, questionsForModule } from "@/content/checkpoints";
import { EXAM_SIZE, EXAM_UNLOCK } from "@/content/checkpoints";
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
        ) order by m."order")
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
 * The questions for one phase exam attempt.
 *
 * Deterministic in the seed so a reload does not hand you a different paper,
 * and drawn across every module in the phase so it cannot be passed by knowing
 * one track well.
 */
export function examPaper(phaseSlug: string, moduleSlugs: string[], seed: number) {
  const pool = questions.filter((q) => moduleSlugs.includes(q.moduleSlug));
  const byModule = new Map<string, typeof pool>();
  for (const q of pool) {
    const list = byModule.get(q.moduleSlug) ?? [];
    list.push(q);
    byModule.set(q.moduleSlug, list);
  }

  // round-robin across modules so coverage is even, then deterministic shuffle
  const ordered: typeof pool = [];
  const lists = [...byModule.values()].map((l) => shuffle(l, seed));
  for (let i = 0; ordered.length < pool.length; i++) {
    for (const l of lists) if (l[i]) ordered.push(l[i]);
  }
  void phaseSlug;
  return ordered.slice(0, Math.min(EXAM_SIZE, ordered.length));
}

/** mulberry32 — small, deterministic, and good enough to shuffle a quiz */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function scoreAnswers(qs: { id: string; answer: number }[], given: Record<string, number>) {
  const correct = qs.filter((q) => given[q.id] === q.answer).length;
  return { score: correct, total: qs.length };
}
