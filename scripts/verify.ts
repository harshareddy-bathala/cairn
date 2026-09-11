import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { journeyDays, problemAttempts, unitProgress, users } from "@/db/schema";
import { openToday, getJourneyState, streaksOf } from "@/lib/journey";
import { getRedoQueue } from "@/lib/progress";
import { generatePlan, getDayContext, getTodayPlan, budgetWith, cadenceDueFor } from "@/lib/planner";
import { aptitudeTopicFor } from "@/content/aptitude";
import { CADENCE, DSA_CURVE, dsaTargetAt } from "@/content/cadence";
import { getMetrics } from "@/lib/sidetracks";
import { modules as contentModules, validateContent } from "@/content";
import { questions, questionsForModule, EXAM_SIZE, CHECKPOINT_PASS } from "@/content/checkpoints";
import { examPaper, getCertificationState, shapeCertification } from "@/lib/certification";

function ok(label: string, pass: boolean, detail = "") {
  console.log(`${label.padEnd(23)}-> ${detail.padEnd(28)} ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exitCode = 1;
}

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
  // an early day with little finished must not read as a failure state
  ok("pace budget has slack", s2.paceBudget > 0.5,
    `${(s2.paceBudget * 100).toFixed(1)}% after 3 days, 1 unit`);

  /* ---------------- the planner ---------------- */
  console.log("");

  const ctx = await getDayContext(u.id);

  const p1 = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, isWeekend: false,
    budgetMin: budgetWith(ctx.budgetMin, 1),
    units: ctx.units, problems: ctx.problems, redo: ctx.redo,
  });
  ok("plan 1x fits budget", p1.plannedMin <= budgetWith(ctx.budgetMin, 1),
    `${p1.plannedMin}m of ${budgetWith(ctx.budgetMin, 1)}m`);
  ok("plan has dsa + close",
    p1.blocks.some((b) => b.kind === "dsa") && p1.blocks.at(-1)?.kind === "close",
    p1.blocks.map((b) => b.kind).join(","));
  ok("core cs survives 1x", p1.blocks.some((b) => b.kind === "corecs"),
    "problems shed before blocks");

  const p2 = generatePlan({
    dayIndex: 4, mode: "catchup", multiplier: 2, isWeekend: false,
    budgetMin: budgetWith(ctx.budgetMin, 2),
    units: ctx.units, problems: ctx.problems, redo: ctx.redo,
  });
  const stretch = p2.blocks.filter((b) => b.stretch).length;
  ok("2x pulls next units", stretch > 0 && p2.plannedMin > p1.plannedMin,
    `${stretch} stretch, ${p2.plannedMin}m`);

  const bad = generatePlan({
    dayIndex: 4, mode: "bad_day", multiplier: 1, budgetMin: 999, isWeekend: false,
    units: ctx.units, problems: ctx.problems, redo: ctx.redo,
  });
  ok("bad day = problem + log",
    bad.blocks.length === 2 && bad.blocks[0].problems.length === 1 && bad.blocks[1].kind === "close",
    `${bad.blocks.length} blocks`);

  const tiny = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, budgetMin: 30, isWeekend: false,
    units: ctx.units, problems: ctx.problems, redo: ctx.redo,
  });
  ok("aptitude never trimmed", tiny.blocks.some((b) => b.kind === "aptitude"),
    tiny.blocks.map((b) => b.kind).join(","));
  ok("dsa never trimmed", tiny.blocks.some((b) => b.kind === "dsa"));

  // The redo is seeded with a problem the generator actually schedules, so the
  // overlap below is guaranteed rather than incidental.
  const planNoRedo = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, budgetMin: 240, isWeekend: false,
    units: ctx.units, problems: ctx.problems, redo: [],
  });
  const alreadyScheduled = planNoRedo.blocks.flatMap((b) => b.problems)[0] ?? ctx.problems[0];

  const withRedo = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, budgetMin: 240, isWeekend: false,
    units: ctx.units, problems: ctx.problems,
    redo: [{ ...alreadyScheduled, outcome: "editorial", redoDueDay: 4 }],
  });
  ok("redo is block one", withRedo.blocks[0]?.kind === "redo", withRedo.blocks[0]?.kind ?? "none");

  // An editorial schedules a redo without marking the problem solved, so it is
  // still a candidate for the DSA block. Scheduling it twice also charged its
  // minutes to the budget twice, which trimmed a block that should have fitted.
  const scheduled = withRedo.blocks.flatMap((b) => b.problems.map((pr) => pr.slug));
  ok("a redo is not also fresh work",
    scheduled.length === new Set(scheduled).size,
    `${scheduled.length} slots, ${new Set(scheduled).size} distinct`);

  /*
   * The problem pool outlives the units it hangs off: 32 DSA units carry 98
   * problems at three a day, so every module finishes owing problems. These
   * run on a built input rather than the seed, because the failure only shows
   * once a module is finished — which the seed, at day one, never is.
   */
  const mkUnit = (slug: string, moduleSlug: string, trackSlug: string): typeof ctx.units[number] => ({
    slug, title: slug, objective: "", estMinutes: 30,
    moduleSlug, moduleTitle: moduleSlug, trackSlug, rnTrack: 1, rnModule: 1,
  });
  const mkProb = (
    slug: string, moduleSlug: string, unitSlug: string | null, trackSlug = "dsa",
  ): typeof ctx.problems[number] => ({
    slug, title: slug, url: "", platform: "leetcode", difficulty: "easy",
    patternTag: "", triggerHint: "", approachHint: "", estMinutes: 20, isMust: false,
    moduleSlug, unitSlug, trackSlug,
  });

  const here = mkUnit("u-now", "m-now", "dsa");
  const backlog = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, budgetMin: 240, isWeekend: false,
    units: [here],
    problems: [
      mkProb("p-now", "m-now", "u-now"),
      ...[1, 2, 3].map((n) => mkProb(`p-old-${n}`, "m-done", null)),
    ],
    redo: [],
  });
  const drained = backlog.blocks.find((b) => b.kind === "dsa")?.problems.map((pr) => pr.slug) ?? [];
  ok("finished modules still owe", drained.length === 3, drained.join(","));
  ok("backlog queues behind today", drained[0] === "p-now", drained[0] ?? "none");

  // A stranded problem is only ever offered to a unit in its own lane.
  const crossed = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, budgetMin: 240, isWeekend: false,
    units: [here],
    problems: [mkProb("p-now", "m-now", "u-now"), mkProb("p-cs", "m-os", null, "corecs")],
    redo: [],
  });
  ok("backlog stays in its track",
    !crossed.blocks.flatMap((b) => b.problems).some((pr) => pr.slug === "p-cs"),
    "no corecs problem in the dsa block");

  // The end state of the same bug: units exhausted, problems remaining.
  const reps = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, budgetMin: 240, isWeekend: false,
    units: [mkUnit("u-cs", "m-os", "corecs")],
    problems: [1, 2, 3, 4].map((n) => mkProb(`p-left-${n}`, "m-done", null)),
    redo: [],
  });
  const practice = reps.blocks.find((b) => b.kind === "dsa");
  ok("dsa survives its last unit",
    practice?.unitSlug === null && practice?.problems.length === 3,
    `${practice?.problems.length ?? 0} problems, no unit`);

  const pools = new Set([1, 2, 3, 4, 5, 6, 7].map((d) => aptitudeTopicFor(d).pool));
  ok("aptitude rotates pools", pools.size === 3, [...pools].join(","));
  ok("aptitude deterministic",
    aptitudeTopicFor(1).topic !== aptitudeTopicFor(4).topic,
    `d1 ${aptitudeTopicFor(1).topic} / d4 ${aptitudeTopicFor(4).topic}`);

  const t1 = await getTodayPlan(u.id);
  const t2 = await getTodayPlan(u.id);
  ok("plan is frozen", t1.plan.generatedAt === t2.plan.generatedAt,
    "no reshuffle on refresh");

  /* ---------------- side tracks ---------------- */
  console.log("");

  // the project block is a weekend affair unless you are running hot
  const weekday = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, isWeekend: false,
    budgetMin: 240, units: ctx.units, problems: ctx.problems, redo: ctx.redo,
    deliverable: ctx.deliverable,
  });
  const weekend = generatePlan({
    dayIndex: 4, mode: "normal", multiplier: 1, isWeekend: true,
    budgetMin: 360, units: ctx.units, problems: ctx.problems, redo: ctx.redo,
    deliverable: ctx.deliverable,
  });
  ok("deliverable is queued", Boolean(ctx.deliverable), ctx.deliverable?.slug ?? "none");
  ok("project block on weekends",
    weekend.blocks.some((b) => b.kind === "project") &&
      !weekday.blocks.some((b) => b.kind === "project"),
    "not on a 4h weekday");

  // an obligation surfaces with time left to act on it, not on the last day
  const cad = [{ kind: "dsa_pair", label: "Timed DSA pair", minutes: 45, short: 2 }];
  const early = generatePlan({
    dayIndex: 2, mode: "normal", multiplier: 1, isWeekend: false, budgetMin: 240,
    units: ctx.units, problems: ctx.problems, redo: ctx.redo, cadenceDue: cad,
  });
  const late = generatePlan({
    dayIndex: 5, mode: "normal", multiplier: 1, isWeekend: false, budgetMin: 240,
    units: ctx.units, problems: ctx.problems, redo: ctx.redo, cadenceDue: cad,
  });
  ok("cadence surfaces late",
    !early.blocks.some((b) => b.kind === "cadence") &&
      late.blocks.some((b) => b.kind === "cadence"),
    "day 5 of the journey week");

  // quotas that have not started yet must not be reported as short
  const wk1 = cadenceDueFor(1, []);
  const wk9 = cadenceDueFor(9, []);
  ok("quotas respect fromWeek",
    wk1.length < wk9.length && !wk1.some((q) => q.kind === "full_mock"),
    `${wk1.length} at week 1, ${wk9.length} at week 9`);
  ok("logging clears a quota",
    cadenceDueFor(1, [{ kind: "tech_mcq", n: 1 }]).every((q) => q.kind !== "tech_mcq"), "");

  // the DSA curve is measured in active days, so it never runs away from you
  const curveOk = DSA_CURVE.every((c) => dsaTargetAt(c.atDay) === c.target);
  let monotonic = true;
  for (let d = 1; d <= 95; d++) if (dsaTargetAt(d) < dsaTargetAt(d - 1)) monotonic = false;
  ok("dsa curve hits its marks", curveOk, DSA_CURVE.map((c) => `${c.target}@${c.atDay}`).join(" "));
  ok("dsa curve is monotonic", monotonic && dsaTargetAt(0) === 0, `day 30 -> ${dsaTargetAt(30)}`);

  // a deliverable without a definition of done is a to-do, and to-dos rot
  ok("content validates", validateContent().length === 0, `${CADENCE.length} quotas defined`);

  const metrics = await getMetrics(u.id, 1);
  ok("metrics read in one trip",
    metrics.deliverablesTotal > 0 && Array.isArray(metrics.aptitude),
    `${metrics.deliverablesTotal} deliverables, ${metrics.dsaSolved} dsa`);

  /* ---------------- certification ---------------- */
  console.log("");

  ok("every module has a paper",
    contentModules.every((m) => questionsForModule(m.slug).length >= 5),
    `${questions.length} questions over ${contentModules.length} modules`);

  const p1Modules = contentModules.filter((m) => m.phaseSlug === "foundations").map((m) => m.slug);
  const paperA = examPaper("foundations", p1Modules, 1234);
  const paperB = examPaper("foundations", p1Modules, 1234);
  const paperC = examPaper("foundations", p1Modules, 9999);
  ok("exam paper is deterministic",
    paperA.map((q) => q.id).join() === paperB.map((q) => q.id).join(), "same seed, same paper");
  ok("exam paper varies by seed",
    paperA.map((q) => q.id).join() !== paperC.map((q) => q.id).join(), "different seed");
  ok("exam is the right size", paperA.length === EXAM_SIZE, `${paperA.length} questions`);
  ok("exam spans the phase",
    new Set(paperA.map((q) => q.moduleSlug)).size >= 8,
    `${new Set(paperA.map((q) => q.moduleSlug)).size} modules represented`);
  ok("exam has no repeats",
    new Set(paperA.map((q) => q.id)).size === paperA.length, "");

  // the exam is gated on progress; progress is never gated on the exam
  const certRaw = await getCertificationState(u.id);
  const { standings } = shapeCertification(certRaw);
  const found = standings.find((s) => s.phaseSlug === "foundations")!;
  ok("exam locked below 80% units", !found.examUnlocked,
    `${found.unitsDone}/${found.unitsTotal} units`);

  // banked work must not inflate the meters
  await db.insert(unitProgress).values({
    userId: u.id, unitSlug: "dsa-cpp-stl-toolchain", state: "done", completedOnDayIndex: 0,
  }).onConflictDoNothing();
  const s3 = await getJourneyState(u.id);
  ok("banked work is not velocity", s3.unitsDone === s3.unitsEarned + 1,
    `${s3.unitsDone} done, ${s3.unitsEarned} earned`);
  ok("banked work adds no stone", s3.stones.length === 3, `${s3.stones.length} stones`);

  ok("checkpoint bar is 80%", CHECKPOINT_PASS === 0.8, "4 of 5");

  /* ---------------- the streak ---------------- */
  console.log("");
  ok("streak counts run",
    streaksOf(["2026-09-07", "2026-09-08", "2026-09-09"], "2026-09-09").current === 3, "3 days");
  ok("streak breaks on gap",
    streaksOf(["2026-09-01", "2026-09-02"], "2026-09-09").current === 0, "0 after 7 idle days");
  ok("longest survives break",
    streaksOf(["2026-09-01", "2026-09-02", "2026-09-09"], "2026-09-09").longest === 2, "2");
  ok("open day keeps streak",
    streaksOf(["2026-09-08"], "2026-09-09").current === 1, "yesterday still counts");

  await db.delete(users).where(eq(users.id, u.id));
  console.log("cleaned up");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
