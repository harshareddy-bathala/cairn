import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { journeyDays, problemAttempts, unitProgress, users } from "@/db/schema";
import { openToday, getJourneyState } from "@/lib/journey";
import { getRedoQueue } from "@/lib/progress";

const EMAIL = "e2e-test@cairn.local";

async function main() {
  // clean slate
  const [old] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (old) await db.delete(users).where(eq(users.id, old.id));
  const [u] = await db.insert(users).values({ email: EMAIL, timezone: "Asia/Kolkata" }).returning();

  // day 1
  const d1 = await openToday(u.id);
  console.log(`open day               -> day_index ${d1}  ${d1 === 1 ? "PASS" : "FAIL"}`);

  const again = await openToday(u.id);
  console.log(`open twice same day    -> day_index ${again}  ${again === 1 ? "PASS (no drift)" : "FAIL"}`);

  // an editorial schedules a redo 3 ACTIVE days out
  await db.insert(problemAttempts).values({
    userId: u.id, problemSlug: "lc-koko-eating-bananas", outcome: "editorial", dayIndex: d1,
    redoDueDay: d1 + 3,
  });
  let q = await getRedoQueue(u.id, d1);
  console.log(`redo on day 1          -> ${q.length} due  ${q.length === 0 ? "PASS (not yet)" : "FAIL"}`);
  q = await getRedoQueue(u.id, d1 + 2);
  console.log(`redo on day 3          -> ${q.length} due  ${q.length === 0 ? "PASS (not yet)" : "FAIL"}`);
  q = await getRedoQueue(u.id, d1 + 3);
  console.log(`redo on day 4          -> ${q.length} due  ${q.length === 1 ? "PASS (surfaced)" : "FAIL"}`);

  // simulate skipping 5 calendar days: close day 1, then fake days 2 and 3
  await db.update(journeyDays).set({ closedAt: new Date() })
    .where(and(eq(journeyDays.userId, u.id), eq(journeyDays.dayIndex, 1)));
  await db.insert(journeyDays).values([
    { userId: u.id, dayIndex: 2, calendarDate: "2026-09-15", closedAt: new Date() },
    { userId: u.id, dayIndex: 3, calendarDate: "2026-09-22", closedAt: new Date() },
  ]);
  const s = await getJourneyState(u.id);
  console.log(`after 2 skipped weeks  -> day_index ${s.dayIndex}, ${s.stones.length} stones  ${s.dayIndex === 3 ? "PASS (no drift)" : "FAIL"}`);

  // a clean re-solve clears the redo
  await db.update(problemAttempts).set({ redoClearedAt: new Date() })
    .where(eq(problemAttempts.userId, u.id));
  await db.insert(problemAttempts).values({
    userId: u.id, problemSlug: "lc-koko-eating-bananas", outcome: "clean", dayIndex: 3,
    redoClearedAt: new Date(),
  });
  q = await getRedoQueue(u.id, 99);
  console.log(`after clean re-solve   -> ${q.length} due  ${q.length === 0 ? "PASS (cleared)" : "FAIL"}`);

  // unit completion moves the trail
  await db.insert(unitProgress).values({
    userId: u.id, unitSlug: "dsa-bs-answer-space", state: "done", completedOnDayIndex: 3,
  });
  const s2 = await getJourneyState(u.id);
  console.log(`unit done              -> ${s2.unitsDone}/${s2.unitsTotal} units, velocity ${s2.velocity.toFixed(2)} u/d  ${s2.unitsDone === 1 ? "PASS" : "FAIL"}`);
  console.log(`pace budget            -> ${(s2.paceBudget * 100).toFixed(1)}%  atTrailhead=${s2.atTrailhead}`);

  await db.delete(users).where(eq(users.id, u.id));
  console.log("cleaned up");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
