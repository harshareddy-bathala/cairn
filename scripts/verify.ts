import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  certificates, hintReveals, journeyDays, problemAttempts, quizSessions, unitProgress, units, modules,
  users,
} from "@/db/schema";
import { openToday, getJourneyState, streaksOf } from "@/lib/journey";
import { getRedoQueue, recordAttempt, revealHintFor } from "@/lib/progress";
import { generatePlan, getDayContext, getTodayPlan, budgetWith, cadenceDueFor } from "@/lib/planner";
import { aptitudeTopicFor } from "@/content/aptitude";
import { CADENCE, DSA_CURVE, dsaTargetAt } from "@/content/cadence";
import { getMetrics } from "@/lib/sidetracks";
import { modules as contentModules, validateContent } from "@/content";
import { questions, questionsForModule, EXAM_SIZE, CHECKPOINT_PASS } from "@/content/checkpoints";
import { getCertificationState, shapeCertification } from "@/lib/certification";
import { drawCheckpoint, drawExam, grade, keyFor, toCanonical, toDisplay } from "@/lib/quiz-paper";
import { startSitting, submitSitting, type Paper } from "@/lib/quiz-sessions";
import { getMisses } from "@/lib/misses";

function ok(label: string, pass: boolean, detail = "") {
  console.log(`${label.padEnd(28)}-> ${detail.padEnd(28)} ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exitCode = 1;
}

const EMAIL = "e2e-test@cairn.local";

async function main() {
  // clean slate
  const [old] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (old) await db.delete(users).where(eq(users.id, old.id));
  const [u] = await db.insert(users).values({ email: EMAIL, timezone: "Asia/Kolkata" }).returning();
  try {
    await checks(u);
  } finally {
    await db.delete(users).where(eq(users.id, u.id));
    console.log("cleaned up");
  }
  // the exit code is the result: CI and deploy scripts read it, not the log
  process.exit(process.exitCode ?? 0);
}

async function checks(u: typeof users.$inferSelect) {
  // day 1 — opened by twenty requests at once, the way a page load, a
  // prefetch and a tap on a second tab arrive together. Each used to be able
  // to lose the insert race and come back with no day at all.
  const opened = await Promise.all(Array.from({ length: 20 }, () => openToday(u.id)));
  const d1 = opened[0]!;
  ok("open day", d1 === 1, `day_index ${d1}`);
  ok("20 concurrent opens", opened.every((d) => d === 1), `${new Set(opened).size} distinct day`);

  const again = await openToday(u.id);
  ok("open twice same day", again === 1, `day_index ${again}, no drift`);

  // an editorial schedules a redo 3 ACTIVE days out
  await db.insert(problemAttempts).values({
    userId: u.id, problemSlug: "lc-koko-eating-bananas", outcome: "editorial", dayIndex: d1,
    redoDueDay: d1 + 3,
  });
  let q = await getRedoQueue(u.id, d1);
  ok("redo on day 1", q.length === 0, `${q.length} due, not yet`);
  q = await getRedoQueue(u.id, d1 + 2);
  ok("redo on day 3", q.length === 0, `${q.length} due, not yet`);
  q = await getRedoQueue(u.id, d1 + 3);
  ok("redo on day 4", q.length === 1, `${q.length} due, surfaced`);

  // simulate skipping 5 calendar days: close day 1, then fake days 2 and 3
  await db.update(journeyDays).set({ closedAt: new Date() })
    .where(and(eq(journeyDays.userId, u.id), eq(journeyDays.dayIndex, 1)));
  await db.insert(journeyDays).values([
    { userId: u.id, dayIndex: 2, calendarDate: "2026-09-15", closedAt: new Date() },
    { userId: u.id, dayIndex: 3, calendarDate: "2026-09-22", closedAt: new Date() },
  ]);
  const s = await getJourneyState(u.id);
  ok("after 2 skipped weeks", s.dayIndex === 3, `day_index ${s.dayIndex}, ${s.stones.length} stones`);

  // a clean re-solve clears the redo
  await db.update(problemAttempts).set({ redoClearedAt: new Date() })
    .where(eq(problemAttempts.userId, u.id));
  await db.insert(problemAttempts).values({
    userId: u.id, problemSlug: "lc-koko-eating-bananas", outcome: "clean", dayIndex: 3,
    redoClearedAt: new Date(),
  });
  q = await getRedoQueue(u.id, 99);
  ok("after clean re-solve", q.length === 0, `${q.length} due, cleared`);

  // unit completion moves the trail
  await db.insert(unitProgress).values({
    userId: u.id, unitSlug: "dsa-bs-answer-space", state: "done", completedOnDayIndex: 3,
  });
  const s2 = await getJourneyState(u.id);
  ok("unit done", s2.unitsDone === 1,
    `${s2.unitsDone}/${s2.unitsTotal} units, ${s2.velocity.toFixed(2)} u/d`);
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
  validatorBites();

  const metrics = await getMetrics(u.id, 1);
  ok("metrics read in one trip",
    metrics.deliverablesTotal > 0 && Array.isArray(metrics.aptitude),
    `${metrics.deliverablesTotal} deliverables, ${metrics.dsaSolved} dsa`);

  // Opening a hint used to insert a `hinted` attempt, and every solved-count
  // reads `hinted` as solved — so the reveal alone was a solve.
  await revealHintFor(u.id, "lc-two-sum");
  const afterReveal = await getMetrics(u.id, 1);
  ok("a reveal is not a solve", afterReveal.dsaSolved === metrics.dsaSolved,
    `${afterReveal.dsaSolved} solved after revealing`);
  const claimedClean = await recordAttempt(u.id, "lc-two-sum", "clean", 12);
  const pendingReveals = await db.select().from(hintReveals).where(eq(hintReveals.userId, u.id));
  ok("reveal downgrades clean", claimedClean?.outcome === "hinted" && pendingReveals.length === 0,
    `recorded ${claimedClean?.outcome}, ${pendingReveals.length} pending`);
  const afterSolve = await getMetrics(u.id, 1);
  ok("the outcome is the solve", afterSolve.dsaSolved === metrics.dsaSolved + 1,
    `${afterSolve.dsaSolved} solved`);
  const second = await recordAttempt(u.id, "lc-two-sum", "clean", 5);
  ok("a reveal is spent once", second?.outcome === "clean", `recorded ${second?.outcome}`);

  /* ---------------- certification ---------------- */
  console.log("");

  ok("every module has a paper",
    contentModules.every((m) => questionsForModule(m.slug).length >= 5),
    `${questions.length} questions over ${contentModules.length} modules`);

  const p1Modules = contentModules.filter((m) => m.phaseSlug === "foundations").map((m) => m.slug);
  const paperA = drawExam(p1Modules, 1234);
  const paperB = drawExam(p1Modules, 1234);
  const paperC = drawExam(p1Modules, 9999);
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

  // The bank was authored with the answer in position b 80 times in 86. Over
  // many sittings, where the right answer is displayed must be uniform.
  const probe = questions[0]!;
  const seen = [0, 0, 0, 0];
  let roundTrip = true;
  for (let seed = 1; seed <= 10_000; seed++) {
    const d = toDisplay(seed, probe.id, probe.answer);
    seen[d]!++;
    if (toCanonical(seed, probe.id, d) !== probe.answer) roundTrip = false;
  }
  ok("answer position uniform",
    seen.every((n) => Math.abs(n / 10_000 - 0.25) <= 0.02),
    seen.map((n) => `${(n / 100).toFixed(1)}%`).join(" "));
  ok("display maps back", roundTrip, "toCanonical(toDisplay(x)) = x");

  // "always the second option" across every checkpoint, one sitting each
  let alwaysB = 0;
  let passedByB = 0;
  for (const m of contentModules) {
    const seed = 7000 + m.order * 31 + m.slug.length;
    const paper = drawCheckpoint(m.slug, seed);
    const g = grade(paper, seed, Object.fromEntries(paper.map((q) => [q.id, 1])));
    alwaysB += g.score;
    if (g.score / g.total >= CHECKPOINT_PASS) passedByB++;
  }
  ok("always-b no longer passes", passedByB <= 1,
    `${passedByB}/${contentModules.length} passed, ${alwaysB}/${questions.length} right`);

  const keyed = drawCheckpoint("dsa-linked-lists", 42);
  const { key } = keyFor(keyed, 42);
  const perfect = grade(keyed, 42, key);
  ok("the key grades perfect", perfect.score === perfect.total && perfect.wrong.length === 0,
    `${perfect.score}/${perfect.total}, stored canonically`);
  ok("attempts store canonical",
    keyed.every((q) => perfect.canonical[q.id] === q.answer), "misses keep working");

  // a double click on "issue" must not mint a second certificate
  const certRow = { userId: u.id, phaseSlug: "foundations", snapshot: {} };
  await db.insert(certificates).values(certRow).onConflictDoNothing();
  await db.insert(certificates).values(certRow).onConflictDoNothing();
  const certs = await db.select().from(certificates).where(eq(certificates.userId, u.id));
  ok("one certificate a phase", certs.length === 1, `${certs.length} after two issues`);
  await db.delete(certificates).where(eq(certificates.userId, u.id));

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

  await sittings(u.id);
}

/**
 * The rules a checkpoint or exam sitting is held to, exercised through the
 * same functions the server actions call. Last, because it banks units and
 * advances the day — both of which the checks above assume have not happened.
 */
/**
 * The validator is only worth its rules if each one fires. A broken module is
 * spliced into the registry, validated, and taken back out — nothing touches
 * the database.
 */
function validatorBites() {
  const base = contentModules.find((m) => m.slug === "dsa-linked-lists")!;
  const unit = (slug: string, over: Partial<(typeof base.units)[number]> = {}) => ({
    ...base.units[0]!,
    slug,
    recall: base.units[0]!.recall!.map((c) => ({ ...c, front: `${slug}: ${c.front}` })),
    ...over,
  });
  const bad = [
    {
      // same place on the trail as the real linked-lists module
      ...base, slug: "zz-a", phaseSlug: "foundations", prereqSlugs: ["zz-b"],
      units: [
        unit("zz-a-long", { estMinutes: 400 }),
        unit("zz-a-noprimary", { resources: base.units[0]!.resources.map((r) => ({ ...r, isPrimary: false })) }),
      ],
      problems: [{ ...base.problems![0]!, slug: "zz-a-p", platform: "leetcode" as const, url: "https://www.geeksforgeeks.org/x/" }],
    },
    { ...base, slug: "zz-b", order: 99, phaseSlug: "depth", prereqSlugs: ["zz-a"], units: [unit("zz-b-1")], problems: [] },
  ];
  const q = (id: string, moduleSlug: string, answer: 0 | 1 | 2 | 3, last = "d") => ({
    id, moduleSlug, prompt: "p", why: "w", answer,
    options: ["a", "b", "c", last] as [string, string, string, string],
  });
  const qs = [
    ...[0, 1, 2, 3, 4, 5].map((i) => q(`zz-a-${i}`, "zz-a", 1)),
    ...[0, 1, 2, 3, 4].map((i) => q(`zz-b-${i}`, "zz-b", (i % 4) as 0 | 1 | 2 | 3, i === 0 ? "All of the above" : "d")),
  ];

  contentModules.push(...bad);
  questions.push(...qs);
  let errors: string[];
  try {
    errors = validateContent();
  } finally {
    contentModules.splice(contentModules.length - bad.length, bad.length);
    questions.splice(questions.length - qs.length, qs.length);
  }
  const fired = (re: RegExp) => errors.some((e) => re.test(e));
  const rules: [string, RegExp][] = [
    ["unit minutes", /zz-a-long: estMinutes 400/],
    ["exactly one primary", /zz-a-noprimary: 0 primary/],
    ["problem host", /zz-a-p: platform leetcode but the link goes to www\.geeksforgeeks\.org/],
    ["track/phase/order", /zz-a: same track, phase and order as dsa-linked-lists/],
    ["prereq phase", /zz-a: prereq zz-b is in a later phase/],
    ["prereq cycle", /prereq cycle: zz-a -> zz-b -> zz-a|prereq cycle: zz-b -> zz-a -> zz-b/],
    ["answer balance", /zz-a: 6 of 6 answers in one position/],
    ["answer spread", /zz-a: answers use only 1 positions/],
    ["positional option", /zz-b-0: option depends on its position/],
  ];
  const missed = rules.filter(([, re]) => !fired(re)).map(([name]) => name);
  ok("validator rules all fire", missed.length === 0,
    missed.length ? `missed: ${missed.join(", ")}` : `${rules.length} rules`);
  ok("validator leaves registry", validateContent().length === 0, "clean after splice");
}

async function sittings(userId: string) {
  console.log("");
  const byId = new Map(questions.map((q) => [q.id, q]));
  /** answers by option *text*, the way a person who knows the material answers */
  const answer = (paper: Paper, right: boolean) =>
    Object.fromEntries(paper.questions.map((q) => {
      const correct = byId.get(q.id)!.options[byId.get(q.id)!.answer];
      const i = q.options.findIndex((o) => (o === correct) === right);
      return [q.id, i];
    }));

  const lockedExam = await startSitting(userId, "exam", "foundations");
  ok("locked exam is refused", !lockedExam.ok, lockedExam.ok ? "served a paper" : lockedExam.error.slice(0, 28));

  const cp = await startSitting(userId, "checkpoint", "dsa-linked-lists");
  if (!cp.ok) return ok("checkpoint sitting starts", false, cp.error);
  ok("paper carries no key",
    cp.questions.every((q) => !("answer" in q) && !("why" in q)), `${cp.questions.length} questions`);
  const resumed = await startSitting(userId, "checkpoint", "dsa-linked-lists");
  ok("open sitting resumes", resumed.ok && resumed.sessionId === cp.sessionId, "same paper on reload");

  const failed = await submitSitting(userId, cp.sessionId, answer(cp, false));
  ok("failed checkpoint: no key",
    failed.ok && !failed.passed && !failed.key && !failed.why && failed.wrong?.length === cp.questions.length,
    failed.ok ? `${failed.score}/${failed.total}, ${failed.wrong?.length} marked` : failed.error);
  const again = await submitSitting(userId, cp.sessionId, answer(cp, true));
  ok("a sitting grades once", !again.ok, again.ok ? "graded twice" : "second submit refused");

  const misses = await getMisses(userId);
  ok("today's misses wait", misses.length === 0, `${misses.length} shown the same day`);

  const cp2 = await startSitting(userId, "checkpoint", "dsa-linked-lists");
  if (!cp2.ok) return ok("retake starts", false, cp2.error);
  ok("a retake is a new sitting", cp2.sessionId !== cp.sessionId, "fresh seed");
  const passed = await submitSitting(userId, cp2.sessionId, answer(cp2, true));
  ok("pass returns the key", passed.ok && passed.passed && Boolean(passed.key && passed.why),
    passed.ok ? `${passed.score}/${passed.total}` : passed.error);

  // a paper that arrives after its clock (and the grace) is spent, not graded
  const cp3 = await startSitting(userId, "checkpoint", "dsa-strings");
  if (!cp3.ok) return ok("late sitting starts", false, cp3.error);
  await db.update(quizSessions).set({ deadlineAt: new Date(Date.now() - 5 * 60_000) })
    .where(eq(quizSessions.id, cp3.sessionId));
  const late = await submitSitting(userId, cp3.sessionId, answer(cp3, true));
  const lateAgain = await submitSitting(userId, cp3.sessionId, answer(cp3, true));
  ok("late paper is refused", !late.ok && !lateAgain.ok, late.ok ? "graded" : late.error.slice(0, 28));

  // an exam session conjured past the lock is still refused at grading
  const forged = drawExam(contentModules.filter((m) => m.phaseSlug === "foundations").map((m) => m.slug), 5);
  const [fs] = await db.insert(quizSessions).values({
    userId, kind: "exam", subjectSlug: "foundations", seed: 5, questionIds: forged.map((q) => q.id),
  }).returning();
  const forgedGrade = await submitSitting(userId, fs!.id, {});
  ok("lock re-checked at grading", !forgedGrade.ok, forgedGrade.ok ? "graded" : "refused");

  // bank the phase, then fail the exam on purpose
  const p1Units = await db.select({ slug: units.slug }).from(units)
    .innerJoin(modules, eq(modules.slug, units.moduleSlug)).where(eq(modules.phaseSlug, "foundations"));
  await db.insert(unitProgress)
    .values(p1Units.map((x) => ({ userId, unitSlug: x.slug, state: "done" as const, completedOnDayIndex: 0 })))
    .onConflictDoNothing();
  const exam = await startSitting(userId, "exam", "foundations");
  if (!exam.ok) return ok("unlocked exam starts", false, exam.error);
  const minutesLeft = exam.deadlineAt ? (exam.deadlineAt - exam.serverNow) / 60_000 : 0;
  ok("exam clock is the server's", minutesLeft > 29 && minutesLeft <= 30, `${minutesLeft.toFixed(1)} min`);
  const examFail = await submitSitting(userId, exam.sessionId, answer(exam, false));
  ok("failed exam: no key",
    examFail.ok && !examFail.passed && !examFail.key && !examFail.why && (examFail.byModule?.length ?? 0) > 0,
    examFail.ok ? `${examFail.score}/${examFail.total}, ${examFail.byModule?.length} modules` : examFail.error);
  const exam2 = await startSitting(userId, "exam", "foundations");
  ok("exam retake is a new paper",
    exam2.ok && exam2.questions.map((q) => q.id).join() !== exam.questions.map((q) => q.id).join(),
    "different questions");

  // a miss that is not followed by a pass, then the next active day
  const cp4 = await startSitting(userId, "checkpoint", "dsa-bit-manipulation");
  if (cp4.ok) await submitSitting(userId, cp4.sessionId, answer(cp4, false));
  await db.insert(journeyDays).values({ userId, dayIndex: 4, calendarDate: "2026-09-23" });
  const tomorrow = await getMisses(userId);
  ok("misses open the next day", tomorrow.length > 0, `${tomorrow.length} with explanations`);
}
main().catch((e) => { console.error(e); process.exit(1); });
