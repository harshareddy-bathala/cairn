import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

/**
 * Wipes your own progress, keeping the curriculum.
 *
 * Every table here is progress, not content — re-seeding is a different script.
 * When a new progress table is added, it belongs in this list, or a "reset" is
 * a lie and the next test run starts from someone else's state.
 */
async function main() {
  const [u] = await db
    .select()
    .from(s.users)
    .where(eq(s.users.email, "harshareddy.bathala@gmail.com"));
  if (!u) {
    console.error("no such user");
    process.exit(1);
  }

  const tables = [
    s.problemAttempts,
    s.unitProgress,
    s.journeyDays,
    s.weekReviews,
    s.flashcards,
    s.aptitudeScores,
    s.mockSessions,
    s.starStories,
    s.deliverableDone,
    s.userProjects,
    s.applications,
    s.contacts,
    s.examAttempts,
  ];

  for (const t of tables) {
    await db.delete(t).where(eq(t.userId, u.id));
  }

  console.log(`reset (${tables.length} tables)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
