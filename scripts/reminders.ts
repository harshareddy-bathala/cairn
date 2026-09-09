import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { journeyDays, reminderSends, users } from "@/db/schema";
import {
  DEFAULT_SLOTS,
  composeReminder,
  dueReminders,
  normaliseSlots,
  recordSends,
  type ReminderContext,
} from "@/lib/reminders";

const EMAIL = "reminders-test@cairn.local";

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(`${label.padEnd(38)} ${pass ? "PASS" : "FAIL"}${detail ? `  ${detail}` : ""}`);
}

/** a context with nothing going on, for the pure-composition checks */
function ctx(over: Partial<ReminderContext> = {}): ReminderContext {
  return {
    userId: "u", chatId: "1", handle: null, timezone: "UTC",
    kind: "morning_plan", at: "07:00", localDate: "2026-09-09",
    todayIndex: 14, todayClosed: false, plan: null, lastDayIndex: 14,
    tomorrowFirstTask: null, closedDates: [], redoDue: 0, doneUnits: [],
    ...over,
  };
}

async function main() {
  /* ---------------- the schedule, normalised ---------------- */

  const filled = normaliseSlots([{ kind: "morning_plan", at: "99:99", enabled: false }]);
  check("normalise fills every kind", filled.length === DEFAULT_SLOTS.length);
  check("normalise rejects a bad time", filled[0].at === "07:00", `got ${filled[0].at}`);
  check("normalise keeps an explicit off", filled[0].enabled === false);

  /* ---------------- composition ---------------- */

  const closed = composeReminder(ctx({ todayClosed: true }));
  check("closed day sends no morning plan", !closed.send);

  const unopened = composeReminder(
    ctx({ todayIndex: null, tomorrowFirstTask: "finish the Docker unit" }),
  );
  check("unopened day still sends", unopened.send);
  check(
    "unopened day quotes the parting note",
    unopened.send && unopened.text.includes("finish the Docker unit"),
  );
  // "Nothing is overdue" is the one sanctioned use of the word — the product's
  // whole claim. Anything else in this family is the dated roadmap leaking back in.
  const copy = unopened.send ? unopened.text : "";
  const scolds =
    /\b(late|missed|behind|failed|should have)\b/i.test(copy) ||
    /(?<!nothing is )overdue/i.test(copy);
  check("unopened day never scolds", unopened.send && !scolds);

  const noStreak = composeReminder(ctx({ kind: "streak_risk", closedDates: [] }));
  check("streak risk is silent at streak 0", !noStreak.send, noStreak.send ? "" : noStreak.reason);

  const atRisk = composeReminder(
    ctx({ kind: "streak_risk", localDate: "2026-09-09", closedDates: ["2026-09-08", "2026-09-09"] }),
  );
  check("streak risk fires with a streak", atRisk.send);

  const plan = {
    plannedMin: 250,
    blocks: [
      { id: "dsa:a", kind: "dsa", title: "Binary search", minutes: 60, unitSlug: "u-a" },
      { id: "aptitude", kind: "aptitude", title: "25 questions", minutes: 30, unitSlug: null },
      { id: "close", kind: "close", title: "Close the day", minutes: 10, unitSlug: null },
    ],
    ticked: ["aptitude"],
  };
  const evening = composeReminder(ctx({ kind: "evening_block", plan }));
  check(
    "evening lists only what is open",
    evening.send && evening.text.includes("Binary search") && !evening.text.includes("25 questions"),
  );
  check("evening ignores the close block", evening.send && !evening.text.includes("Close the day"));

  const allDone = composeReminder(
    ctx({ kind: "evening_block", plan, doneUnits: ["u-a"] }),
  );
  check("evening is silent when nothing is open", !allDone.send);

  /* ---------------- the due window, against the database ---------------- */

  const [old] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (old) await db.delete(users).where(eq(users.id, old.id));
  const [u] = await db
    .insert(users)
    .values({ email: EMAIL, timezone: "UTC", telegramChatId: "test-chat", handle: null })
    .returning();

  // a slot whose local time is exactly now, decided in the database so the
  // script cannot race the clock between reading it and querying
  await db.execute(sql`
    update users set reminder_slots = jsonb_build_array(jsonb_build_object(
      'kind', 'morning_plan',
      'at', to_char(now() at time zone 'UTC', 'HH24:MI'),
      'enabled', true
    ))
    where id = ${u.id}
  `);

  let due = (await dueReminders({ userId: u.id })).filter((d) => d.userId === u.id);
  check("a slot at now is due", due.length === 1, `${due.length} due`);

  // THE invariant: a reminder reports the trail, it does not walk it.
  const rows = await db.select().from(journeyDays).where(eq(journeyDays.userId, u.id));
  check("the tick never opens a day", rows.length === 0, `${rows.length} journey_days rows`);
  check("an unopened day reports day 1", due[0]?.todayIndex === null && due[0]?.lastDayIndex === 0);

  if (due[0]) {
    await recordSends([
      {
        userId: u.id, kind: "morning_plan", localDate: due[0].localDate,
        status: "sent", dayIndex: null, reason: null,
      },
    ]);
  }
  due = (await dueReminders({ userId: u.id })).filter((d) => d.userId === u.id);
  check("a sent slot does not fire twice", due.length === 0, `${due.length} due`);

  // disabled slots never reach the composer at all
  await db.execute(sql`
    update users set reminder_slots = jsonb_build_array(jsonb_build_object(
      'kind', 'close_day',
      'at', to_char(now() at time zone 'UTC', 'HH24:MI'),
      'enabled', false
    ))
    where id = ${u.id}
  `);
  due = (await dueReminders({ userId: u.id })).filter((d) => d.userId === u.id);
  check("a disabled slot never fires", due.length === 0, `${due.length} due`);

  const sends = await db.select().from(reminderSends).where(eq(reminderSends.userId, u.id));
  check("the send is recorded once", sends.length === 1, `${sends.length} rows`);

  await db.delete(users).where(eq(users.id, u.id));
  const orphans = await db.select().from(reminderSends).where(eq(reminderSends.userId, u.id));
  check("sends cascade with the user", orphans.length === 0);

  console.log(failures === 0 ? "\nall reminder invariants hold" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
