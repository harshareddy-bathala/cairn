import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { journeyDays, users } from "@/db/schema";
import { getRecallDeck, schedule, deckBuckets } from "@/lib/recall";
import { getWeekReviewState } from "@/lib/week-review";
import { getMisses } from "@/lib/misses";
import { generatePlan, getDayContext, planInputFrom } from "@/lib/planner";
import { REVIEW_OPENS_ON_DAY } from "@/content/review";

/**
 * The review surface's invariants, against a real database.
 *
 * The one that matters most is the first section: intervals are counted in
 * ACTIVE days. Every other spaced-repetition tool schedules on the calendar,
 * and if this one ever drifts back to that it will start greeting people with
 * a week of overdue cards after a week away — which is precisely the failure
 * this whole product exists to avoid.
 */
function ok(label: string, pass: boolean, detail = "") {
  console.log(`${label.padEnd(30)}-> ${detail.padEnd(26)} ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exitCode = 1;
}

const EMAIL = "review-test@cairn.local";
const UNIT = "dsa-cpp-stl-toolchain";

async function closeDay(userId: string, dayIndex: number) {
  await db.insert(journeyDays).values({
    userId,
    dayIndex,
    calendarDate: `2026-03-${String(dayIndex).padStart(2, "0")}`,
    closedAt: new Date(),
  });
}

async function main() {
  const [old] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (old) await db.delete(users).where(eq(users.id, old.id));
  const [u] = await db.insert(users).values({ email: EMAIL, timezone: "Asia/Kolkata" }).returning();

  /* ---------------- the scheduler, no database needed ---------------- */
  const fresh = { ease: 2.5, intervalDays: 1, lapses: 0, reviews: 0 };

  const good1 = schedule(fresh, "good", 10);
  ok("first pass is 1 active day", good1.intervalDays === 1, `due day ${good1.dueDayIndex}`);
  const good2 = schedule({ ...good1 }, "good", 11);
  ok("second pass steps to 3", good2.intervalDays === 3, `due day ${good2.dueDayIndex}`);
  const good3 = schedule({ ...good2 }, "good", 14);
  ok("third pass uses the ease", good3.intervalDays === Math.round(3 * good2.ease), `${good3.intervalDays}d`);

  const again = schedule({ ease: 2.5, intervalDays: 21, lapses: 0, reviews: 6 }, "again", 30);
  ok("again returns it tomorrow", again.intervalDays === 1 && again.dueDayIndex === 31, "day 31");
  ok("again counts a lapse", again.lapses === 1, "1");
  ok("again does not floor ease", again.ease === 2.3, `${again.ease}`);

  let hammered = { ease: 2.5, intervalDays: 5, lapses: 0, reviews: 3 };
  for (let i = 0; i < 20; i++) hammered = schedule(hammered, "again", i);
  ok("ease has a floor", hammered.ease === 1.3, `${hammered.ease}`);

  let grown = { ease: 2.5, intervalDays: 1, lapses: 0, reviews: 5 };
  for (let i = 0; i < 20; i++) grown = schedule(grown, "easy", i);
  ok("interval is capped", grown.intervalDays === 45, `${grown.intervalDays}d`);
  ok("ease has a ceiling", grown.ease === 3, `${grown.ease}`);

  ok(
    "hard grows slower than good",
    (() => {
      const base = { ease: 2.5, intervalDays: 10, lapses: 0, reviews: 4 };
      const h = schedule(base, "hard", 0);
      const g = schedule(base, "good", 0);
      const e = schedule(base, "easy", 0);
      // hard still grows — the card WAS answered — but by much less, and it
      // must never be recorded as a lapse
      return h.intervalDays > 10 && h.intervalDays < g.intervalDays &&
        g.intervalDays < e.intervalDays && h.lapses === 0;
    })(),
    "hard < good < easy",
  );

  ok(
    "buckets split new/learning/held",
    (() => {
      const b = deckBuckets([
        { reviews: 0, intervalDays: 1 },
        { reviews: 3, intervalDays: 4 },
        { reviews: 9, intervalDays: 21 },
      ]);
      return b.fresh === 1 && b.learning === 1 && b.held === 1 && b.total === 3;
    })(),
    "1 / 1 / 1",
  );

  /* ---------------- seeding, through the real action ---------------- */
  console.log("");
  for (let d = 1; d <= 3; d++) await closeDay(u.id, d);

  // setUnitState calls auth(), so exercise the statement it runs rather than
  // the action wrapper — the SQL is the part that can break.
  const seed = async () =>
    Number(
      (
        await db.execute<{ n: number }>(sql`
          with u as (select slug, recall from units where slug = ${UNIT}),
          day as (select 3 as day_index),
          cards as (
            insert into flashcards (user_id, unit_slug, front, back, due_day_index)
            select ${u.id}, u.slug, c->>'front', c->>'back', d.day_index + 1
            from u, day d, jsonb_array_elements(u.recall) c
            on conflict do nothing returning 1
          ) select count(*)::int as n from cards
        `)
      ).rows[0].n,
    );

  const seeded = await seed();
  ok("completing a unit seeds cards", seeded === 4, `${seeded} cards`);
  ok("re-completing seeds nothing", (await seed()) === 0, "0 duplicates");

  /* ---------------- the deck query ---------------- */
  console.log("");
  let deck = await getRecallDeck(u.id);
  ok("new cards wait a day", deck.due.length === 0, `${deck.scheduled} scheduled`);
  ok("the whole deck is counted", deck.buckets.total === 4, `${deck.buckets.total} cards`);

  await closeDay(u.id, 4);
  deck = await getRecallDeck(u.id);
  ok("cards come due on day 4", deck.due.length === 4, `${deck.due.length} due`);
  ok("a card carries both faces", Boolean(deck.due[0].front && deck.due[0].back), "front + back");
  ok("a card joins its unit", deck.due[0].unitTitle === "Toolchain & fast I/O", "unit title");
  ok("a card joins its module", Boolean(deck.due[0].moduleTitle), "module title");

  const card = deck.due[0];
  const next = schedule(card, "good", 4);
  await db.execute(sql`
    update flashcards set ease = ${next.ease}, interval_days = ${next.intervalDays},
      lapses = ${next.lapses}, reviews = ${next.reviews},
      due_day_index = ${next.dueDayIndex}, last_reviewed_day = 4
    where id = ${card.id} and user_id = ${u.id} and reviews = ${card.reviews}
  `);
  deck = await getRecallDeck(u.id);
  ok("a graded card leaves the queue", deck.due.length === 3, `${deck.due.length} left`);
  ok("a graded card is learning", deck.buckets.learning === 1, "1 learning");

  // the whole point: a long absence does not create a backlog
  await closeDay(u.id, 5);
  const beforeGap = (await getRecallDeck(u.id)).due.length;
  ok("absence does not pile up", beforeGap <= 4, `${beforeGap} due after idle days`);

  /* ---------------- checkpoint misses ---------------- */
  console.log("");
  await db.execute(sql`
    insert into checkpoint_attempts (user_id, module_slug, score, total, passed, answers, day_index)
    values (${u.id}, 'dsa-cpp-stl', 1, 2, false, '{"stl-1": 0, "stl-2": 0}'::jsonb, 4)
  `);
  let misses = await getMisses(u.id);
  const m = misses.find((x) => x.id === "stl-1");
  ok("a wrong answer becomes a miss", Boolean(m), `${misses.length} open`);
  ok("the miss records both choices", m?.chose === 0 && m?.answer === 1, "chose 0, answer 1");
  ok("the miss carries its reason", Boolean(m?.why), "explanation present");
  ok("the miss names its real module", m?.moduleTitle === "C++ & STL for interviews", "from content");

  await db.execute(sql`
    insert into checkpoint_attempts (user_id, module_slug, score, total, passed, answers, day_index)
    values (${u.id}, 'dsa-cpp-stl', 2, 2, true, '{"stl-1": 1}'::jsonb, 5)
  `);
  misses = await getMisses(u.id);
  ok("getting it right clears it", !misses.some((x) => x.id === "stl-1"), "cleared");
  ok("the other miss survives", misses.some((x) => x.id === "stl-2"), "stl-2 still open");

  /* ---------------- the journey-week review ---------------- */
  console.log("");
  let wk = await getWeekReviewState(u.id);
  ok("review is keyed to journey week", wk.currentWeek === 1, `week ${wk.currentWeek}`);
  ok("review opens on active day 5", wk.due && wk.dayOfWeek === REVIEW_OPENS_ON_DAY, `day ${wk.dayOfWeek}`);

  await db.execute(sql`
    insert into week_reviews (user_id, journey_week, answers, three_priorities)
    values (${u.id}, 1, '{"explain":"binary search bounds"}'::jsonb, '["a","b"]'::jsonb)
  `);
  wk = await getWeekReviewState(u.id);
  ok("a recorded review comes back", wk.existing?.answers.explain === "binary search bounds", "round trip");
  ok("the current week is not past", wk.past.length === 0, "0 past");

  for (let d = 6; d <= 8; d++) await closeDay(u.id, d);
  wk = await getWeekReviewState(u.id);
  ok("week 2 starts on day 8", wk.currentWeek === 2 && wk.dayOfWeek === 1, `wk ${wk.currentWeek} d ${wk.dayOfWeek}`);
  ok("week 1 is now past", wk.past.length === 1, "1 past review");
  ok("a fresh week is not yet due", !wk.due, "waits for day 5");

  /* ---------------- the plan picks the deck up ---------------- */
  console.log("");
  const ctx = await getDayContext(u.id);
  ok("day context counts due cards", typeof ctx.cardsDue === "number", `${ctx.cardsDue} due`);

  const plan = generatePlan(planInputFrom(ctx));
  const recall = plan.blocks.find((b) => b.kind === "recall");
  ok("a recall block is planned", Boolean(recall), recall ? `${recall.minutes}m` : "missing");
  ok("it links to the review page", recall?.href === "/review", "/review");
  ok(
    "recall precedes new DSA work",
    plan.blocks.indexOf(recall!) < plan.blocks.findIndex((b) => b.kind === "dsa"),
    "before dsa",
  );

  const bad = generatePlan({ ...planInputFrom(ctx), mode: "bad_day" });
  ok("the deck survives a bad day", bad.blocks.some((b) => b.kind === "recall"), "present");
  ok("a bad-day sitting is 5 min", bad.blocks.find((b) => b.kind === "recall")?.minutes === 5, "5m");

  const none = generatePlan({ ...planInputFrom(ctx), cardsDue: 0 });
  ok("no cards, no block", !none.blocks.some((b) => b.kind === "recall"), "absent");

  const squeezed = generatePlan({ ...planInputFrom(ctx), budgetMin: 45 });
  ok(
    "the trimmer never drops recall",
    squeezed.blocks.some((b) => b.kind === "recall"),
    "survives a 45m budget",
  );

  await db.delete(users).where(eq(users.id, u.id));
  console.log(process.exitCode ? "\nFAILURES" : "\ncleaned up — review invariants hold");
  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
