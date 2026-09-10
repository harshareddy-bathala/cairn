import { sql } from "drizzle-orm";
import { db } from "@/db";
import { modules } from "@/content";
import { questions } from "@/content/checkpoints";

/**
 * The questions you got wrong, and have not since got right.
 *
 * `checkpoint_attempts.answers` was already being stored — question id to
 * chosen option index — with the stated intention that "a review page can show
 * the misses". This is that page's half of the bargain.
 *
 * A miss clears itself: answering the same question correctly on any later
 * attempt removes it. So the list is what you currently get wrong, not a
 * permanent record of every mistake, which would only grow and be ignored.
 */

export type Miss = {
  id: string;
  moduleSlug: string;
  moduleTitle: string;
  prompt: string;
  options: string[];
  answer: number;
  /** the option you picked, on your most recent attempt at it */
  chose: number;
  why: string;
  /** how many separate attempts you have got this one wrong on */
  times: number;
};

type Row = { question_id: string; chose: number; attempt_id: number };

export async function getMisses(userId: string): Promise<Miss[]> {
  // One statement, unrolling every attempt's answers map into rows. The
  // correctness comparison happens in TypeScript rather than SQL, because the
  // answer key lives in content/ — duplicating it into the query would let the
  // two drift silently, and a wrong answer key is worse than no misses page.
  const res = await db.execute<Row>(sql`
    select
      kv.key as question_id,
      (kv.value #>> '{}')::int as chose,
      a.id as attempt_id
    from checkpoint_attempts a, jsonb_each(a.answers) kv
    where a.user_id = ${userId}
    order by a.id
  `);

  const byId = new Map(questions.map((q) => [q.id, q]));
  const titles = new Map(modules.map((m) => [m.slug, m.title]));

  /** question id -> every choice made for it, oldest attempt first */
  const history = new Map<string, number[]>();
  for (const row of res.rows) {
    const list = history.get(row.question_id) ?? [];
    list.push(Number(row.chose));
    history.set(row.question_id, list);
  }

  const misses: Miss[] = [];
  for (const [id, choices] of history) {
    const q = byId.get(id);
    // a question content no longer defines is a deletion, not a miss
    if (!q) continue;

    const latest = choices[choices.length - 1];
    if (latest === q.answer) continue;

    misses.push({
      id: q.id,
      moduleSlug: q.moduleSlug,
      moduleTitle: titles.get(q.moduleSlug) ?? q.moduleSlug,
      prompt: q.prompt,
      options: [...q.options],
      answer: q.answer,
      chose: latest,
      why: q.why,
      times: choices.filter((c) => c !== q.answer).length,
    });
  }

  // most-missed first: a question you have now got wrong three times is the one
  // actually worth reading the explanation for
  return misses.sort((a, b) => b.times - a.times || a.id.localeCompare(b.id));
}
