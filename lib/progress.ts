import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { problemAttempts, problems } from "@/db/schema";

/** an editorial or a failure resurfaces this many ACTIVE days later, never calendar days */
export const REDO_DELAY_DAYS = 3;

/** Problems due to be re-solved on or before the current day. */
export async function getRedoQueue(userId: string, dayIndex: number) {
  return db
    .select({
      problemSlug: problemAttempts.problemSlug,
      redoDueDay: problemAttempts.redoDueDay,
      outcome: problemAttempts.outcome,
      title: problems.title,
      url: problems.url,
      difficulty: problems.difficulty,
      patternTag: problems.patternTag,
      triggerHint: problems.triggerHint,
      approachHint: problems.approachHint,
      estMinutes: problems.estMinutes,
      unitSlug: problems.unitSlug,
    })
    .from(problemAttempts)
    .innerJoin(problems, eq(problems.slug, problemAttempts.problemSlug))
    .where(
      and(
        eq(problemAttempts.userId, userId),
        isNull(problemAttempts.redoClearedAt),
        sql`${problemAttempts.redoDueDay} <= ${dayIndex}`,
      ),
    )
    .orderBy(problemAttempts.redoDueDay);
}
