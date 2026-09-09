import { eq } from "drizzle-orm";
import { db } from "@/db";
import { problemAttempts, unitProgress, journeyDays, users } from "@/db/schema";
async function main() {
  const [u] = await db.select().from(users).where(eq(users.email, "harshareddy.bathala@gmail.com"));
  await db.delete(problemAttempts).where(eq(problemAttempts.userId, u.id));
  await db.delete(unitProgress).where(eq(unitProgress.userId, u.id));
  await db.delete(journeyDays).where(eq(journeyDays.userId, u.id));
  console.log("reset"); process.exit(0);
}
main();
