// Two recall cards due now, for the keyboard walkthrough (scripts/keys.mjs).
// A fresh account has an empty deck until units are finished and a day passes,
// and the deck is the surface whose keyboard handling most needs driving.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { flashcards, users } from "@/db/schema";
async function main() {
  const email = (process.env.E2E_EMAIL ?? "e2e@cairn.local").toLowerCase();
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u) throw new Error(`no user ${email} — run an e2e script once first`);
  await db.delete(flashcards).where(eq(flashcards.userId, u.id));
  await db.insert(flashcards).values([
    { userId: u.id, front: "kbd test card one", back: "answer one", dueDayIndex: 0 },
    { userId: u.id, front: "kbd test card two", back: "answer two", dueDayIndex: 0 },
  ]);
  console.log("seeded 2 cards");
  process.exit(0);
}
main();
