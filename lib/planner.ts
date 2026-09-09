import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { DayMode, Difficulty, Outcome } from "@/db/schema";
import { aptitudeTopicFor } from "@/content/aptitude";
import { CADENCE } from "@/content/cadence";

/* ------------------------------------------------------------------ *
 * the shape of a day
 * ------------------------------------------------------------------ */

export type BlockKind =
  | "redo" | "dsa" | "aptitude" | "domain" | "corecs" | "project" | "cadence" | "close";

export type PlanProblem = {
  slug: string;
  title: string;
  url: string;
  platform: string;
  difficulty: Difficulty;
  patternTag: string;
  triggerHint: string;
  approachHint: string;
  estMinutes: number;
  isMust: boolean;
  outcome?: Outcome | null;
  redoDueDay?: number | null;
};

export type PlanBlock = {
  /** stable for the life of the day, so ticks survive a refresh */
  id: string;
  kind: BlockKind;
  track: string | null;
  title: string;
  detail: string | null;
  href: string | null;
  minutes: number;
  /** the unit this block completes, when there is one — lets `done` be derived */
  unitSlug: string | null;
  problems: PlanProblem[];
  /** true when this block is above the day's core and only fits because of catch-up */
  stretch: boolean;
};

export type DayPlan = {
  dayIndex: number;
  mode: DayMode;
  multiplier: number;
  budgetMin: number;
  plannedMin: number;
  blocks: PlanBlock[];
  generatedAt: string;
};

/** what the plan looks like once reality is folded back in */
export type HydratedBlock = PlanBlock & { done: boolean };
export type HydratedPlan = Omit<DayPlan, "blocks"> & {
  blocks: HydratedBlock[];
  doneMin: number;
};

/* ------------------------------------------------------------------ *
 * the generator
 * ------------------------------------------------------------------ */

export type CandidateUnit = {
  slug: string;
  title: string;
  objective: string;
  estMinutes: number;
  moduleSlug: string;
  moduleTitle: string;
  trackSlug: string;
  /** rank within its track, 1 = next up */
  rnTrack: number;
  /** rank within its module, 1 = next up */
  rnModule: number;
};

export type OpenDeliverable = {
  slug: string;
  title: string;
  projectSlug: string;
  projectName: string;
  estMinutes: number;
};

/** a weekly quota that has not been met and is running out of week */
export type CadenceDue = { kind: string; label: string; minutes: number; short: number };

export type PlanInput = {
  dayIndex: number;
  mode: DayMode;
  multiplier: number;
  budgetMin: number;
  /** weekends get the bigger budget and the project block */
  isWeekend: boolean;
  units: CandidateUnit[];
  problems: (PlanProblem & { moduleSlug: string; unitSlug: string | null })[];
  redo: PlanProblem[];
  deliverable?: OpenDeliverable | null;
  cadenceDue?: CadenceDue[];
};

/** DevOps four days out of five, SDE on the fifth. The roadmap's Wed fork, generalised. */
function domainTrackFor(dayIndex: number) {
  return dayIndex % 5 === 0 ? "sde" : "devops";
}

const REDO_CAP = 3;
const DSA_PROBLEM_CAP = 3;
const APTITUDE_MIN = 30;

/** problems for a unit: its own first, then its module's, never one already solved */
function problemsFor(input: PlanInput, unit: CandidateUnit, cap: number) {
  const mine = input.problems.filter((p) => p.unitSlug === unit.slug);
  const module = input.problems.filter((p) => p.moduleSlug === unit.moduleSlug && p.unitSlug !== unit.slug);
  return [...mine, ...module].slice(0, cap);
}

function nextInTrack(input: PlanInput, track: string, nth: number) {
  return input.units.filter((u) => u.trackSlug === track).at(nth);
}

/**
 * Core CS rotates by module rather than draining OS before touching DBMS —
 * revision only works spaced out, and the interview asks all three.
 */
function nextCoreCs(input: PlanInput) {
  const cs = input.units.filter((u) => u.trackSlug === "corecs");
  if (cs.length === 0) return undefined;
  const moduleSlugs = [...new Set(cs.map((u) => u.moduleSlug))].sort();
  const start = (input.dayIndex - 1) % moduleSlugs.length;
  for (let i = 0; i < moduleSlugs.length; i++) {
    const m = moduleSlugs[(start + i) % moduleSlugs.length];
    const u = cs.find((x) => x.moduleSlug === m);
    if (u) return u;
  }
  return undefined;
}

function unitBlock(
  kind: BlockKind,
  u: CandidateUnit,
  problems: PlanProblem[],
  stretch = false,
): PlanBlock {
  return {
    id: `${kind}:${u.slug}`,
    kind,
    track: u.trackSlug,
    title: u.title,
    detail: u.moduleTitle,
    href: `/unit/${u.slug}`,
    minutes: u.estMinutes + problems.reduce((n, p) => n + p.estMinutes, 0),
    unitSlug: u.slug,
    problems,
    stretch,
  };
}

function closeBlock(): PlanBlock {
  return {
    id: "close",
    kind: "close",
    track: null,
    title: "Close the day",
    detail: "what you learned · tomorrow's first task",
    href: null,
    minutes: 10,
    unitSlug: null,
    problems: [],
    stretch: false,
  };
}

/**
 * Builds the day. Pure — same inputs, same plan — so a refresh never reshuffles
 * your morning, and the whole thing is testable without a database.
 *
 * You never decide what to do. That was the failure this app exists to fix.
 */
export function generatePlan(input: PlanInput): DayPlan {
  const blocks: PlanBlock[] = [];

  // A bad day is not a failed day. Minimum viable chain: one problem, then log
  // it. The streak survives, which is the whole point of having the button.
  if (input.mode === "bad_day") {
    const p = input.redo[0] ?? input.problems[0];
    if (p) {
      blocks.push({
        id: `dsa:minimum`,
        kind: "dsa",
        track: "dsa",
        title: "One problem",
        detail: "the minimum chain — this is enough today",
        href: null,
        minutes: p.estMinutes,
        unitSlug: null,
        problems: [p],
        stretch: false,
      });
    }
    blocks.push(closeBlock());
    return {
      dayIndex: input.dayIndex,
      mode: input.mode,
      multiplier: 1,
      budgetMin: blocks.reduce((n, b) => n + b.minutes, 0),
      plannedMin: blocks.reduce((n, b) => n + b.minutes, 0),
      blocks,
      generatedAt: new Date().toISOString(),
    };
  }

  const extra =
    input.multiplier >= 2
      ? { dsa: 1, domain: 1, corecs: 1 }
      : input.multiplier >= 1.5
        ? { dsa: 1, domain: 0, corecs: 0 }
        : { dsa: 0, domain: 0, corecs: 0 };

  // 1. Redo first, always. These are problems you already believed were done.
  if (input.redo.length > 0) {
    const shown = input.redo.slice(0, REDO_CAP);
    blocks.push({
      id: "redo",
      kind: "redo",
      track: "dsa",
      title: "Redo queue",
      detail:
        input.redo.length > REDO_CAP
          ? `${shown.length} of ${input.redo.length} due — re-solve clean`
          : "you opened the editorial on these — re-solve clean",
      href: null,
      minutes: shown.reduce((n, p) => n + p.estMinutes, 0),
      unitSlug: null,
      problems: shown,
      stretch: false,
    });
  }

  // 2. DSA — the compounding lane, never trimmed.
  const used = new Set<string>();
  for (let i = 0; i <= extra.dsa; i++) {
    const u = nextInTrack(input, "dsa", i);
    if (!u) break;
    const ps = problemsFor(input, u, DSA_PROBLEM_CAP).filter((p) => !used.has(p.slug));
    ps.forEach((p) => used.add(p.slug));
    blocks.push(unitBlock("dsa", u, ps, i > 0));
  }

  // 3. Aptitude — daily, timed, protected from the trimmer.
  const apt = aptitudeTopicFor(input.dayIndex);
  blocks.push({
    id: "aptitude",
    kind: "aptitude",
    track: "aptitude",
    title: `25 questions — ${apt.topic}`,
    detail: `${apt.pool}, timed`,
    href: "/metrics",
    minutes: APTITUDE_MIN,
    unitSlug: null,
    problems: [],
    stretch: false,
  });

  // 4. Domain — DevOps 4 : SDE 1.
  const domain = domainTrackFor(input.dayIndex);
  for (let i = 0; i <= extra.domain; i++) {
    const u = nextInTrack(input, domain, i);
    if (!u) break;
    blocks.push(unitBlock("domain", u, [], i > 0));
  }

  // 5. Core CS — rotating revision.
  const cs = nextCoreCs(input);
  if (cs) blocks.push(unitBlock("corecs", cs, [], false));
  if (extra.corecs > 0) {
    const second = input.units.find((u) => u.trackSlug === "corecs" && u.slug !== cs?.slug);
    if (second) blocks.push(unitBlock("corecs", second, [], true));
  }

  // 6. The project. Weekends have the budget for it; on a weekday it only earns
  //    a place when you are deliberately running hot.
  const d = input.deliverable;
  if (d && (input.isWeekend || input.multiplier >= 1.5)) {
    blocks.push({
      id: `project:${d.slug}`,
      kind: "project",
      track: "project",
      title: d.title,
      detail: d.projectName,
      href: "/projects",
      minutes: d.estMinutes,
      unitSlug: null,
      problems: [],
      stretch: !input.isWeekend,
    });
  }

  // 7. Obligations whose journey week is running out. A quota that surfaces on
  //    day 5 is still recoverable; one that surfaces on day 7 is a lecture.
  const dayOfWeek = ((input.dayIndex - 1) % 7) + 1;
  if (dayOfWeek >= 5) {
    for (const q of input.cadenceDue ?? []) {
      blocks.push({
        id: `cadence:${q.kind}`,
        kind: "cadence",
        track: "aptitude",
        title: q.label,
        detail: `${q.short} short — journey week ends in ${8 - dayOfWeek} day${8 - dayOfWeek === 1 ? "" : "s"}`,
        href: "/career",
        minutes: q.minutes,
        unitSlug: null,
        problems: [],
        stretch: false,
      });
    }
  }

  // 6. Trim to the budget. Redo, the first DSA block, aptitude and the close are
  //    load-bearing — the roadmap's own "never cut" list. Everything else goes,
  //    stretch blocks first.
  const protectedIds = new Set<string>(["redo", "aptitude", "close"]);
  const firstDsa = blocks.find((b) => b.kind === "dsa");
  if (firstDsa) protectedIds.add(firstDsa.id);

  // trimmed first to last: stretch blocks, then Core CS, the project, the
  // domain lane, and finally the week's outstanding obligations
  const RANK: Record<string, number> = { corecs: 0, project: 1, domain: 2, cadence: 3 };
  const trimOrder = (b: PlanBlock) => (b.stretch ? 0 : 10) + (RANK[b.kind] ?? 4);

  const total = () => blocks.reduce((n, b) => n + b.minutes, 0);
  const ceiling = input.budgetMin - 10; // the close costs 10

  // First shed problems rather than blocks. Dropping Core CS entirely to fit a
  // third array problem is the wrong trade — OS, DBMS and CN are interview gates
  // too, and they only stick if they are touched often.
  while (total() > ceiling) {
    const fat = blocks
      .filter((b) => b.problems.length > 1 && b.kind !== "redo")
      .sort((a, b) => b.problems.length - a.problems.length)[0];
    if (!fat) break;
    const dropped = fat.problems.pop()!;
    fat.minutes -= dropped.estMinutes;
  }

  while (total() > ceiling) {
    const victim = blocks
      .filter((b) => !protectedIds.has(b.id))
      .sort((a, b) => trimOrder(a) - trimOrder(b))[0];
    if (!victim) break;
    blocks.splice(blocks.indexOf(victim), 1);
  }

  blocks.push(closeBlock());

  return {
    dayIndex: input.dayIndex,
    mode: input.mode,
    multiplier: input.multiplier,
    budgetMin: input.budgetMin,
    plannedMin: total(),
    blocks,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * the data layer — one round trip
 * ------------------------------------------------------------------ */

/** how deep down each track the generator is allowed to look */
const CANDIDATE_DEPTH = 4;

export type DayContext = {
  dayIndex: number;
  mode: DayMode;
  multiplier: number;
  closed: boolean;
  isWeekend: boolean;
  journeyWeek: number;
  deliverable: OpenDeliverable | null;
  mocksThisWeek: { kind: string; n: number }[];
  learned: string | null;
  tomorrowFirstTask: string | null;
  minutesTotal: number;
  budgetMin: number;
  storedPlan: (DayPlan & { ticked?: string[] }) | null;
  units: CandidateUnit[];
  problems: (PlanProblem & { moduleSlug: string; unitSlug: string | null })[];
  redo: PlanProblem[];
  doneUnits: string[];
};

/**
 * Opens today and fetches everything the planner needs in a single statement.
 *
 * Seven separate queries here would cost seven round trips; at this distance
 * that is the difference between the page feeling like an instrument and
 * feeling like a website.
 */
export async function getDayContext(userId: string): Promise<DayContext> {
  const res = await db.execute<{ data: DayContext }>(sql`
    with tz as (
      select coalesce(timezone, 'Asia/Kolkata') as tz from users where id = ${userId}
    ),
    today as (
      select to_char((now() at time zone (select tz from tz))::date, 'YYYY-MM-DD') as d,
             extract(isodow from (now() at time zone (select tz from tz))::date) as dow
    ),
    existing as (
      select day_index, mode, multiplier, closed_at, learned_md, tomorrow_first_task,
             minutes_total, plan
      from journey_days
      where user_id = ${userId} and calendar_date = (select d from today)
    ),
    started as (
      update users set started_at = now() where id = ${userId} and started_at is null returning 1
    ),
    ins as (
      insert into journey_days (user_id, day_index, calendar_date)
      select ${userId},
        (select coalesce(max(day_index), 0) + 1 from journey_days where user_id = ${userId}),
        (select d from today)
      where not exists (select 1 from existing)
      on conflict do nothing
      returning day_index
    ),
    -- A row inserted by a sibling CTE is invisible to the rest of this statement,
    -- so a freshly opened day has to carry the column defaults itself. Reading it
    -- back from the table would return nothing on the first load of the day and
    -- plan the whole day against a null budget.
    day as (
      select day_index, 'normal'::text as mode, 1::real as multiplier,
             null::timestamptz as closed_at, null::text as learned_md,
             null::text as tomorrow_first_task, 0 as minutes_total, null::jsonb as plan
      from ins
      union all
      select day_index, mode, multiplier, closed_at, learned_md, tomorrow_first_task,
             minutes_total, plan
      from existing
      limit 1
    ),
    prog as (select unit_slug, state from unit_progress where user_id = ${userId}),
    cand as (
      select un.slug, un.title, un.objective, un.est_minutes, m.slug as module_slug,
             m.title as module_title, m.track_slug,
             row_number() over (partition by m.track_slug order by m."order", un."order") as rn_track,
             row_number() over (partition by m.slug order by un."order") as rn_module
      from units un
      join modules m on m.slug = un.module_slug
      left join prog p on p.unit_slug = un.slug
      where coalesce(p.state, 'available') <> 'done'
    ),
    top as (select * from cand where rn_track <= ${CANDIDATE_DEPTH}),
    solved as (
      select distinct problem_slug from problem_attempts
      where user_id = ${userId} and outcome in ('clean', 'hinted')
    ),
    prob as (
      select p.slug, p.title, p.url, p.platform, p.difficulty, p.pattern_tag, p.trigger_hint,
             p.approach_hint, p.est_minutes, p.is_must, p.module_slug, p.unit_slug, p."order"
      from problems p
      where p.module_slug in (select distinct module_slug from top)
        and p.slug not in (select problem_slug from solved)
    ),
    redoq as (
      select a.problem_slug as slug, p.title, p.url, p.platform, p.difficulty, p.pattern_tag,
             p.trigger_hint, p.approach_hint, p.est_minutes, p.is_must,
             a.outcome, a.redo_due_day
      from problem_attempts a
      join problems p on p.slug = a.problem_slug, day d
      where a.user_id = ${userId} and a.redo_cleared_at is null
        and a.redo_due_day is not null and a.redo_due_day <= d.day_index
    )
    select json_build_object(
      'dayIndex', (select day_index from day),
      'mode', (select mode from day),
      'multiplier', (select multiplier from day),
      'closed', (select closed_at is not null from day),
      'isWeekend', (select dow from today) >= 6,
      'journeyWeek', (select ceil(day_index / 7.0)::int from day),
      'deliverable', (
        -- the next unfinished deliverable, earliest project first
        select json_build_object(
          'slug', d.slug, 'title', d.title, 'projectSlug', p.slug,
          'projectName', p.name, 'estMinutes', d.est_minutes
        )
        from deliverables d
        join projects p on p.slug = d.project_slug
        where not exists (
          select 1 from deliverable_done dd
          where dd.user_id = ${userId} and dd.deliverable_slug = d.slug
        )
        order by p."order", d."order"
        limit 1
      ),
      'mocksThisWeek', coalesce((
        select json_agg(json_build_object('kind', kind, 'n', n))
        from (
          select kind, count(*)::int as n from mock_sessions, day d
          where user_id = ${userId} and journey_week = ceil(d.day_index / 7.0)::int
          group by kind
        ) mk
      ), '[]'::json),
      'learned', (select learned_md from day),
      'tomorrowFirstTask', (select tomorrow_first_task from day),
      'minutesTotal', (select minutes_total from day),
      'budgetMin', (
        select case when (select dow from today) >= 6 then u.budget_weekend_min
                    else u.budget_weekday_min end
        from users u where u.id = ${userId}
      ),
      'storedPlan', (select plan from day),
      'doneUnits', coalesce((
        select json_agg(unit_slug) from prog where state = 'done'
      ), '[]'::json),
      'units', coalesce((
        select json_agg(json_build_object(
          'slug', slug, 'title', title, 'objective', objective, 'estMinutes', est_minutes,
          'moduleSlug', module_slug, 'moduleTitle', module_title, 'trackSlug', track_slug,
          'rnTrack', rn_track, 'rnModule', rn_module
        ) order by track_slug, rn_track) from top
      ), '[]'::json),
      'problems', coalesce((
        select json_agg(json_build_object(
          'slug', slug, 'title', title, 'url', url, 'platform', platform,
          'difficulty', difficulty, 'patternTag', pattern_tag, 'triggerHint', trigger_hint,
          'approachHint', approach_hint, 'estMinutes', est_minutes, 'isMust', is_must,
          'moduleSlug', module_slug, 'unitSlug', unit_slug
        ) order by module_slug, (unit_slug is null), "order") from prob
      ), '[]'::json),
      'redo', coalesce((
        select json_agg(json_build_object(
          'slug', slug, 'title', title, 'url', url, 'platform', platform,
          'difficulty', difficulty, 'patternTag', pattern_tag, 'triggerHint', trigger_hint,
          'approachHint', approach_hint, 'estMinutes', est_minutes, 'isMust', is_must,
          'outcome', outcome, 'redoDueDay', redo_due_day
        ) order by redo_due_day) from redoq
      ), '[]'::json)
    ) as data
  `);

  const data = res.rows[0]?.data;
  if (!data) throw new Error("could not open today");
  return data;
}

/** the multiplier a fresh day inherits — the user's standing catch-up setting */
export function budgetWith(budgetMin: number, multiplier: number) {
  return Math.round(budgetMin * multiplier);
}

/**
 * Today's plan, frozen once generated.
 *
 * The plan is written into journey_days.plan the first time it is asked for, so
 * finishing a unit does not silently shuffle the rest of your morning. Only
 * changing the catch-up multiplier or hitting bad-day regenerates it.
 */
export type Today = {
  plan: HydratedPlan;
  closed: boolean;
  isWeekend: boolean;
  journeyWeek: number;
  deliverable: OpenDeliverable | null;
  mocksThisWeek: { kind: string; n: number }[];
  learned: string | null;
  tomorrowFirstTask: string | null;
  minutesTotal: number;
  budgetMin: number;
};

export async function getTodayPlan(userId: string): Promise<Today> {
  const ctx = await getDayContext(userId);

  let plan = ctx.storedPlan as (DayPlan & { ticked?: string[] }) | null;
  const ticked = new Set(plan?.ticked ?? []);

  if (!plan) {
    plan = generatePlan(planInputFrom(ctx));
    await savePlan(userId, ctx.dayIndex, plan);
  }

  return {
    plan: hydrate(plan, ctx, ticked),
    closed: ctx.closed,
    isWeekend: ctx.isWeekend,
    journeyWeek: ctx.journeyWeek,
    deliverable: ctx.deliverable,
    mocksThisWeek: ctx.mocksThisWeek,
    learned: ctx.learned,
    tomorrowFirstTask: ctx.tomorrowFirstTask,
    minutesTotal: ctx.minutesTotal,
    budgetMin: budgetWith(ctx.budgetMin, ctx.multiplier),
  };
}

function hydrate(
  plan: DayPlan & { ticked?: string[] },
  ctx: DayContext,
  ticked: Set<string>,
): HydratedPlan {
  const doneUnits = new Set(ctx.doneUnits ?? []);
  const stillDue = new Set(ctx.redo.map((p) => p.slug));

  const blocks: HydratedBlock[] = plan.blocks.map((b) => {
    let done = ticked.has(b.id);
    if (b.unitSlug) done = doneUnits.has(b.unitSlug);
    else if (b.kind === "redo") done = b.problems.every((p) => !stillDue.has(p.slug));
    else if (b.kind === "close") done = ctx.closed;
    return { ...b, done };
  });

  return {
    ...plan,
    mode: ctx.mode,
    multiplier: ctx.multiplier,
    blocks,
    doneMin: blocks.filter((b) => b.done).reduce((n, b) => n + b.minutes, 0),
  };
}

/** the generator's inputs, assembled from a day context */
export function planInputFrom(
  ctx: DayContext,
  over: { mode?: DayMode; multiplier?: number } = {},
) {
  const multiplier = over.multiplier ?? ctx.multiplier;
  return {
    dayIndex: ctx.dayIndex,
    mode: over.mode ?? ctx.mode,
    multiplier,
    budgetMin: budgetWith(ctx.budgetMin, multiplier),
    isWeekend: ctx.isWeekend,
    units: ctx.units,
    problems: ctx.problems,
    redo: ctx.redo,
    deliverable: ctx.deliverable,
    cadenceDue: cadenceDueFor(ctx.journeyWeek, ctx.mocksThisWeek),
  };
}

export async function savePlan(userId: string, dayIndex: number, plan: DayPlan & { ticked?: string[] }) {
  await db.execute(sql`
    update journey_days set plan = ${JSON.stringify(plan)}::jsonb
    where user_id = ${userId} and day_index = ${dayIndex}
  `);
}


/** which of this journey week's quotas are still short */
export function cadenceDueFor(journeyWeek: number, logged: { kind: string; n: number }[]) {
  return CADENCE.filter((q) => journeyWeek >= q.fromWeek)
    .map((q) => {
      const done = logged.find((x) => x.kind === q.kind)?.n ?? 0;
      return { kind: q.kind, label: q.label, minutes: q.minutes, short: Math.ceil(q.perWeek) - done };
    })
    .filter((q) => q.short > 0);
}
