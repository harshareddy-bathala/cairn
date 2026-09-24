import { questions, questionsForModule, EXAM_SIZE, type Question } from "@/content/checkpoints";

/**
 * Drawing a paper: which questions, in what order, with the options in what
 * order. Pure — no database — so verify can exercise it directly.
 *
 * Every sitting gets a fresh random seed (see quiz_sessions), and the seed
 * decides everything here. The options are shuffled per question because the
 * bank was authored with the right answer in position b 80 times out of 86: in
 * authored order, "always b" passed sixteen checkpoints out of seventeen.
 *
 * Content keeps its authored order and its canonical answer index. Stored
 * attempts and lib/misses.ts speak canonical; only the browser sees display
 * order, and `toCanonical` / `toDisplay` translate at the boundary.
 */

/** 1.5 minutes a question: tight enough to matter, fair enough to pass */
export const EXAM_MINUTES_PER_QUESTION = 1.5;
/** how late a submission may land after the clock and still be graded */
export const DEADLINE_GRACE_MS = 30_000;

export function examMinutes(questionCount: number) {
  return Math.round(questionCount * EXAM_MINUTES_PER_QUESTION);
}

/** mulberry32 — small, deterministic, and good enough to shuffle a quiz */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, 32-bit — turns a string into a seed */
export function fnv1a(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** a seed for a new sitting; fits Postgres `integer` */
export function newSeed() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! & 0x7fffffff;
}

/**
 * The questions for one phase exam sitting.
 *
 * Round-robin across modules so coverage is even and the paper cannot be
 * passed by knowing one track well, then capped at EXAM_SIZE.
 */
export function drawExam(moduleSlugs: string[], seed: number): Question[] {
  const pool = questions.filter((q) => moduleSlugs.includes(q.moduleSlug));
  const byModule = new Map<string, Question[]>();
  for (const q of pool) {
    const list = byModule.get(q.moduleSlug) ?? [];
    list.push(q);
    byModule.set(q.moduleSlug, list);
  }
  const lists = shuffle([...byModule.values()], seed).map((l, i) => shuffle(l, seed + i + 1));
  const ordered: Question[] = [];
  for (let i = 0; ordered.length < pool.length; i++) {
    for (const l of lists) if (l[i]) ordered.push(l[i]);
  }
  return ordered.slice(0, Math.min(EXAM_SIZE, ordered.length));
}

/** A checkpoint is the module's whole bank, in a fresh order each sitting. */
export function drawCheckpoint(moduleSlug: string, seed: number): Question[] {
  return shuffle(questionsForModule(moduleSlug), seed);
}

/** display position -> canonical option index, for one question in one sitting */
export function optionOrder(seed: number, questionId: string): number[] {
  return shuffle([0, 1, 2, 3], fnv1a(`${seed}:${questionId}`));
}

export function toCanonical(seed: number, questionId: string, display: number) {
  return optionOrder(seed, questionId)[display]!;
}

export function toDisplay(seed: number, questionId: string, canonical: number) {
  return optionOrder(seed, questionId).indexOf(canonical);
}

/** what the browser is given: display order, and no answer */
export type PaperQuestion = {
  id: string;
  moduleSlug: string;
  prompt: string;
  options: string[];
};

export function present(q: Question, seed: number): PaperQuestion {
  return {
    id: q.id,
    moduleSlug: q.moduleSlug,
    prompt: q.prompt,
    options: optionOrder(seed, q.id).map((i) => q.options[i]!),
  };
}

/** the stored paper back into questions; one content has since removed is dropped */
export function paperFrom(questionIds: string[]): Question[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return questionIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
}

export type Graded = {
  score: number;
  total: number;
  /** question id -> chosen option, canonical — what attempts store */
  canonical: Record<string, number>;
  /** ids answered wrong or left blank, in paper order */
  wrong: string[];
  byModule: { moduleSlug: string; score: number; total: number }[];
};

/** grades display-order answers against the paper they were given on */
export function grade(paper: Question[], seed: number, display: Record<string, number>): Graded {
  const canonical: Record<string, number> = {};
  const wrong: string[] = [];
  const modules = new Map<string, { score: number; total: number }>();
  let score = 0;

  for (const q of paper) {
    const m = modules.get(q.moduleSlug) ?? { score: 0, total: 0 };
    m.total++;
    const d = display[q.id];
    const c = d == null ? undefined : toCanonical(seed, q.id, d);
    if (c != null) canonical[q.id] = c;
    if (c === q.answer) {
      score++;
      m.score++;
    } else {
      wrong.push(q.id);
    }
    modules.set(q.moduleSlug, m);
  }

  return {
    score,
    total: paper.length,
    canonical,
    wrong,
    byModule: [...modules].map(([moduleSlug, v]) => ({ moduleSlug, ...v })),
  };
}

/** the key and explanations, in display order — only ever sent after a pass */
export function keyFor(paper: Question[], seed: number) {
  return {
    key: Object.fromEntries(paper.map((q) => [q.id, toDisplay(seed, q.id, q.answer)])),
    why: Object.fromEntries(paper.map((q) => [q.id, q.why])),
  };
}
