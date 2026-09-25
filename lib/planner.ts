import { sql } from "drizzle-orm";
import { db } from "@/db";
import { openTodayCte, retryUnopened } from "@/lib/open-today";
import type { DayMode, Difficulty, Outcome } from "@/db/schema";
import { aptitudeTopicFor } from "@/content/aptitude";
import { CADENCE, perWeekFor } from "@/content/cadence";

/* ------------------------------------------------------------------ *
 * the shape of a day
 * ------------------------------------------------------------------ */

export type BlockKind =
  | "redo" | "recall" | "dsa" | "aptitude" | "domain" | "corecs" | "career" | "project"
  | "cadence" | "close";

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
  /** set on redo items, so a lane that wants DSA can tell a SQL redo apart */
  trackSlug?: string;
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
  /** the phase's order, 1 = foundations; every lane walks phases in order */
  phaseOrder: number;
  moduleOrder: number;
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

/**
 * Where a lane stands: the earliest phase it still has units in, and how much
 * of that phase is left. What decides which domain lane is further behind.
 */
export type TrackStanding = { track: string; phaseOrder: number; total: number; remaining: number };

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
  problems: (PlanProblem & { moduleSlug: string; unitSlug: string | null; trackSlug: string })[];
  redo: PlanProblem[];
  deliverable?: OpenDeliverable | null;
  cadenceDue?: CadenceDue[];
  /** recall cards whose interval has come due on or before today */
  cardsDue?: number;
  standing?: TrackStanding[];
};

/** the domain lanes, in the order a tie goes */
const DOMAIN_TRACKS = ["devops", "sde"] as const;

/**
 * The domain lane that is further behind, among those with a unit to offer.
 *
 * First the one still in an earlier phase, then the one with the larger share
 * of its current phase left; a tie goes to DevOps. This replaced a fixed
 * DevOps 4 : SDE 1 rotation, which starved SDE whatever its size: a lane that
 * is half the length of the other should finish its phase at the same time,
 * not three times later.
 */
function laggingTrack(
  input: PlanInput,
  next: (track: string) => CandidateUnit | undefined,
): string | undefined {
  return DOMAIN_TRACKS.flatMap((track, tie) => {
    const u = next(track);
    if (!u) return [];
    const s = input.standing?.find((x) => x.track === track);
    return [{ track, tie, phase: s?.phaseOrder ?? u.phaseOrder, left: s && s.total ? s.remaining / s.total : 0 }];
  }).sort((a, b) => a.phase - b.phase || b.left - a.left || a.tie - b.tie)[0]?.track;
}

/** the career lane runs on these days of each journey week */
const CAREER_DAYS = new Set([3, 6]);

const REDO_CAP = 3;
const DSA_PROBLEM_CAP = 3;
const APTITUDE_MIN = 30;

/**
 * Problems for a unit: its own first, then the rest of its module's, then any
 * stranded in the same track by a module whose units are all finished.
 *
 * Problems hang off modules, and a module owes far more of them than its units
 * can carry — arrays is 6 units against 23 problems at three a day. The
 * stranded tail is therefore the normal case, not an edge one, and it queues
 * behind the current module rather than interleaving with it: today should
 * still read as today's module, with the backlog filling the slots the current
 * module can no longer fill.
 *
 * `used` is applied before the cap, not after: taking three and then dropping
 * the ones already in the day leaves a short block while candidates remain.
 */
function problemsFor(input: PlanInput, unit: CandidateUnit, cap: number, used: Set<string>) {
  const live = new Set(input.units.map((u) => u.moduleSlug));
  const open = input.problems.filter((p) => !used.has(p.slug));
  const mine = open.filter((p) => p.unitSlug === unit.slug);
  const module = open.filter((p) => p.moduleSlug === unit.moduleSlug && p.unitSlug !== unit.slug);
  const stranded = open.filter((p) => p.trackSlug === unit.trackSlug && !live.has(p.moduleSlug));
  // and when even those run out, the next modules' problems in the same lane —
  // three a day outpaces a unit's own, and the reps should not stop for it
  const ahead = open.filter(
    (p) => p.trackSlug === unit.trackSlug && p.moduleSlug !== unit.moduleSlug && live.has(p.moduleSlug),
  );
  return [...mine, ...module, ...stranded, ...ahead].slice(0, cap);
}

/**
 * Problems for a unit outside DSA: only the ones bound to that unit, and at
 * most two. A SQL problem belongs to the unit that teaches the query — it is
 * not reps, and it must never leak into a DSA block or inflate the DSA count.
 */
function ownProblems(input: PlanInput, unit: CandidateUnit, used: Set<string>) {
  const ps = input.problems.filter((p) => p.unitSlug === unit.slug && !used.has(p.slug)).slice(0, 2);
  ps.forEach((p) => used.add(p.slug));
  return ps;
}

function nextInTrack(input: PlanInput, track: string, nth: number) {
  return input.units.filter((u) => u.trackSlug === track).at(nth);
}

/**
 * Core CS rotates by module rather than draining OS before touching DBMS —
 * revision only works spaced out, and the interview asks all three. It rotates
 * within the earliest phase that still has units, in module order: DBMS depth
 * waits until Phase 1's DBMS is done, like every other lane.
 */
function nextCoreCs(input: PlanInput) {
  const all = input.units.filter((u) => u.trackSlug === "corecs");
  if (all.length === 0) return undefined;
  const phase = Math.min(...all.map((u) => u.phaseOrder));
  const cs = all.filter((u) => u.phaseOrder === phase);
  const moduleSlugs = [
    ...new Set([...cs].sort((a, b) => a.moduleOrder - b.moduleOrder).map((u) => u.moduleSlug)),
  ];
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
    // The deck survives a bad day. It is five minutes, it is the only block that
    // protects work already done, and letting it lapse is what turns one bad day
    // into a fortnight of relearning.
    if ((input.cardsDue ?? 0) > 0) {
      blocks.push({
        id: "recall",
        kind: "recall",
        track: "recall",
        title: `Recall — ${input.cardsDue} card${input.cardsDue === 1 ? "" : "s"}`,
        detail: "five minutes, and nothing you already paid for lapses",
        href: "/review",
        minutes: 5,
        unitSlug: null,
        problems: [],
        stretch: false,
      });
    }
    // DSA only: the minimum chain is the compounding lane, not a SQL exercise
    const isDsa = (x: PlanProblem & { trackSlug?: string }) => (x.trackSlug ?? "dsa") === "dsa";
    const p = input.redo.find(isDsa) ?? input.problems.find(isDsa);
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

  // 1b. The deck, before anything new is learned.
  //
  // Retrieval is cheap and it decays; a card left a week past due is close to
  // relearning it from scratch. Ten minutes here protects everything already
  // paid for, which is why it sits above the new material rather than below it.
  if ((input.cardsDue ?? 0) > 0) {
    const n = input.cardsDue!;
    blocks.push({
      id: "recall",
      kind: "recall",
      track: "recall",
      title: `Recall — ${n} card${n === 1 ? "" : "s"}`,
      detail: "spaced by active day, so nothing is ever overdue",
      href: "/review",
      // ~20s a card, floored at 5 and capped at 15: a deck sitting is short by
      // design, and a long one means the cap in getRecallDeck is doing its job
      minutes: Math.min(15, Math.max(5, Math.round((n * 20) / 60))),
      unitSlug: null,
      problems: [],
      stretch: false,
    });
  }

  // 2. DSA — the compounding lane, never trimmed.
  //
  // Seeded with the redo queue. An "editorial" outcome schedules a redo but
  // does not count as solved, so the same problem is still a candidate here —
  // without this it lands in the plan twice, and its minutes are charged to the
  // budget twice, which then trims a block that would otherwise have fitted.
  // Every problem awaiting a redo is excluded, not just the ones shown: past
  // the cap it is still work you have already attempted, not fresh work.
  const used = new Set<string>(input.redo.map((p) => p.slug));
  for (let i = 0; i <= extra.dsa; i++) {
    const u = nextInTrack(input, "dsa", i);
    if (!u) break;
    const ps = problemsFor(input, u, DSA_PROBLEM_CAP, used);
    ps.forEach((p) => used.add(p.slug));
    blocks.push(unitBlock("dsa", u, ps, i > 0));
  }

  // The track runs out of units long before it runs out of problems — 32 units
  // carry 98 of them. DSA still has to happen on those days; there is simply no
  // unit left to hang it on, so the block stands on its own.
  if (!nextInTrack(input, "dsa", 0)) {
    const ps = input.problems
      .filter((p) => p.trackSlug === "dsa" && !used.has(p.slug))
      .slice(0, DSA_PROBLEM_CAP);
    if (ps.length > 0) {
      ps.forEach((p) => used.add(p.slug));
      blocks.push({
        id: "dsa:practice",
        kind: "dsa",
        track: "dsa",
        title: "Practice",
        detail: "every unit is read — what is left is the reps",
        href: null,
        minutes: ps.reduce((n, p) => n + p.estMinutes, 0),
        unitSlug: null,
        problems: ps,
        stretch: false,
      });
    }
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

  // 4. Domain — whichever of DevOps and SDE is further behind.
  const taken = new Set<string>();
  const nextFree = (track: string) =>
    input.units.find((u) => u.trackSlug === track && !taken.has(u.slug));
  const place = (kind: BlockKind, u: CandidateUnit, stretch: boolean) => {
    taken.add(u.slug);
    blocks.push(unitBlock(kind, u, ownProblems(input, u, used), stretch));
  };
  const domain = laggingTrack(input, nextFree);
  for (let i = 0; domain && i <= extra.domain; i++) {
    const u = nextFree(domain);
    if (!u) break;
    place("domain", u, i > 0);
  }

  // 5. Core CS — rotating revision. A lane that has run out of Core CS gives
  //    the slot to the domain lane that is behind, rather than to nothing.
  const cs = nextCoreCs(input);
  if (cs) place("corecs", cs, false);
  else {
    const lag = laggingTrack(input, nextFree);
    const u = lag ? nextFree(lag) : undefined;
    if (u) place("domain", u, false);
  }
  if (extra.corecs > 0) {
    const second = nextFree("corecs");
    if (second) place("corecs", second, true);
  }

  // 5b. Career — twice a journey week. The story bank and the resumes are an
  //     interview gate like any other, and they do not get written by waiting
  //     for a free evening.
  const dayOfWeek = ((input.dayIndex - 1) % 7) + 1;
  if (CAREER_DAYS.has(dayOfWeek)) {
    const u = nextFree("career");
    if (u) place("career", u, false);
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
  const protectedIds = new Set<string>(["redo", "recall", "aptitude", "close"]);
  const firstDsa = blocks.find((b) => b.kind === "dsa");
  if (firstDsa) protectedIds.add(firstDsa.id);

  // trimmed first to last: stretch blocks, then Core CS, career, the project,
  // the domain lane, and finally the week's outstanding obligations
  const RANK: Record<string, number> = { corecs: 0, career: 1, project: 2, domain: 3, cadence: 4 };
  const trimOrder = (b: PlanBlock) => (b.stretch ? 0 : 10) + (RANK[b.kind] ?? 5);

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
  problems: (PlanProblem & { moduleSlug: string; unitSlug: string | null; trackSlug: string })[];
  redo: PlanProblem[];
  doneUnits: string[];
  cardsDue: number;
  standing: TrackStanding[];
  /** problems with an attempt logged on today's active day */
  attemptedToday: string[];
  /** an aptitude score has been logged today */
  aptitudeToday: boolean;
  /** every project deliverable already shipped */
  deliverablesDone: string[];
  /** the last closed day's log, read back the next morning */
  yesterday: { dayIndex: number; learned: string | null; firstTask: string | null } | null;
};

/**
 * Opens today and fetches everything the planner needs in a single statement.
 *
 * Seven separate queries here would cost seven round trips; at this distance
 * that is the difference between the page feeling like an instrument and
 * feeling like a website.
 */
export async function getDayContext(userId: string): Promise<DayContext> {
  const run = () => db.execute<{ data: DayContext }>(sql`
    with ${openTodayCte(userId)},
    prog as (select unit_slug, state from unit_progress where user_id = ${userId}),
    /*
     * Phase first, then module, then unit. Module order restarts in each phase,
     * so ordering by module alone would slot Phase 2's first module in beside
     * Phase 1's. Each lane walks its own phases; no lane waits on another.
     */
    cand as (
      select un.slug, un.title, un.objective, un.est_minutes, m.slug as module_slug,
             m.title as module_title, m.track_slug, ph."order" as phase_order,
             m."order" as module_order,
             row_number() over (
               partition by m.track_slug order by ph."order", m."order", un."order"
             ) as rn_track,
             row_number() over (partition by m.slug order by un."order") as rn_module
      from units un
      join modules m on m.slug = un.module_slug
      join phases ph on ph.slug = m.phase_slug
      left join prog p on p.unit_slug = un.slug
      where coalesce(p.state, 'available') <> 'done'
    ),
    -- Core CS rotates across modules, so it needs every module's next unit,
    -- not just the first few units of whichever module comes first
    top as (
      select * from cand
      where rn_track <= ${CANDIDATE_DEPTH} or (track_slug = 'corecs' and rn_module = 1)
    ),
    standing as (
      select distinct on (track_slug) track_slug, phase_order, total, remaining
      from (
        select m.track_slug, ph."order" as phase_order, count(*)::int as total,
               count(*) filter (where coalesce(p.state, 'available') <> 'done')::int as remaining
        from units un
        join modules m on m.slug = un.module_slug
        join phases ph on ph.slug = m.phase_slug
        left join prog p on p.unit_slug = un.slug
        group by 1, 2
      ) per_phase
      where remaining > 0
      order by track_slug, phase_order
    ),
    solved as (
      select distinct problem_slug from problem_attempts
      where user_id = ${userId} and outcome in ('clean', 'hinted')
    ),
    /*
     * A module keeps owing problems after its last unit is ticked. Sourcing
     * only from modules that still have an unfinished unit strands the
     * remainder at that moment — permanently, since the redo queue reaches only
     * what you have already attempted and nothing else looks at problems at
     * all. So a finished module stays in the pool while it still owes unsolved
     * problems, and problemsFor queues those behind current work.
     */
    drained as (
      select m.slug as module_slug
      from modules m
      where not exists (select 1 from cand c where c.module_slug = m.slug)
    ),
    prob as (
      select p.slug, p.title, p.url, p.platform, p.difficulty, p.pattern_tag, p.trigger_hint,
             p.approach_hint, p.est_minutes, p.is_must, p.module_slug, p.unit_slug, p."order",
             m.track_slug, m."order" as module_order, ph."order" as phase_order
      from problems p
      join modules m on m.slug = p.module_slug
      join phases ph on ph.slug = m.phase_slug
      where (p.module_slug in (select module_slug from top)
             or p.module_slug in (select module_slug from drained))
        and p.slug not in (select problem_slug from solved)
    ),
    redoq as (
      select a.problem_slug as slug, p.title, p.url, p.platform, p.difficulty, p.pattern_tag,
             p.trigger_hint, p.approach_hint, p.est_minutes, p.is_must,
             a.outcome, a.redo_due_day, m.track_slug
      from problem_attempts a
      join problems p on p.slug = a.problem_slug
      join modules m on m.slug = p.module_slug, day d
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
          select ms.kind, count(*)::int as n from mock_sessions ms, day d
          where ms.user_id = ${userId} and ms.journey_week = ceil(d.day_index / 7.0)::int
          group by ms.kind
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
      'cardsDue', (
        select count(*)::int from flashcards f, day d
        where f.user_id = ${userId} and f.due_day_index <= d.day_index
      ),
      'doneUnits', coalesce((
        select json_agg(unit_slug) from prog where state = 'done'
      ), '[]'::json),
      'attemptedToday', coalesce((
        select json_agg(distinct a.problem_slug) from problem_attempts a, day d
        where a.user_id = ${userId} and a.day_index = d.day_index
      ), '[]'::json),
      'aptitudeToday', exists (
        select 1 from aptitude_scores s, day d
        where s.user_id = ${userId} and s.day_index = d.day_index
      ),
      'yesterday', (
        select json_build_object(
          'dayIndex', j.day_index, 'learned', j.learned_md, 'firstTask', j.tomorrow_first_task
        )
        from journey_days j, day d
        where j.user_id = ${userId} and j.day_index < d.day_index and j.closed_at is not null
        order by j.day_index desc
        limit 1
      ),
      'deliverablesDone', coalesce((
        select json_agg(deliverable_slug) from deliverable_done where user_id = ${userId}
      ), '[]'::json),
      'units', coalesce((
        select json_agg(json_build_object(
          'slug', slug, 'title', title, 'objective', objective, 'estMinutes', est_minutes,
          'moduleSlug', module_slug, 'moduleTitle', module_title, 'trackSlug', track_slug,
          'phaseOrder', phase_order, 'moduleOrder', module_order,
          'rnTrack', rn_track, 'rnModule', rn_module
        ) order by track_slug, rn_track) from top
      ), '[]'::json),
      'standing', coalesce((
        select json_agg(json_build_object(
          'track', track_slug, 'phaseOrder', phase_order, 'total', total, 'remaining', remaining
        )) from standing
      ), '[]'::json),
      'problems', coalesce((
        select json_agg(json_build_object(
          'slug', slug, 'title', title, 'url', url, 'platform', platform,
          'difficulty', difficulty, 'patternTag', pattern_tag, 'triggerHint', trigger_hint,
          'approachHint', approach_hint, 'estMinutes', est_minutes, 'isMust', is_must,
          'moduleSlug', module_slug, 'unitSlug', unit_slug, 'trackSlug', track_slug
        ) order by phase_order, module_order, (unit_slug is null), "order") from prob
      ), '[]'::json),
      'redo', coalesce((
        select json_agg(json_build_object(
          'slug', slug, 'title', title, 'url', url, 'platform', platform,
          'difficulty', difficulty, 'patternTag', pattern_tag, 'triggerHint', trigger_hint,
          'approachHint', approach_hint, 'estMinutes', est_minutes, 'isMust', is_must,
          'outcome', outcome, 'redoDueDay', redo_due_day, 'trackSlug', track_slug
        ) order by redo_due_day) from redoq
      ), '[]'::json)
    ) as data
  `);

  const res = await retryUnopened(run, (r) => r.rows[0]?.data?.dayIndex != null);
  const data = res.rows[0]?.data;
  if (!data || data.dayIndex == null) throw new Error("could not open today");
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
  yesterday: DayContext["yesterday"];
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
    yesterday: ctx.yesterday ?? null,
  };
}

/** what the day has actually recorded — everything blockDone reads */
export type BlockSignals = {
  doneUnits: Set<string>;
  /** redo problems still due */
  redoDue: Set<string>;
  cardsDue: number;
  closed: boolean;
  attemptedToday: Set<string>;
  aptitudeToday: boolean;
  deliverablesDone: Set<string>;
  /** cadence kinds whose weekly quota is still short */
  cadenceShort: Set<string>;
};

/**
 * Whether a block is finished.
 *
 * Every kind has a way to reach done. Where the work leaves a trace — a unit
 * ticked, a problem attempted, a score logged, a deliverable shipped, a quota
 * met — that trace decides it; a manual tick is the fallback for work done
 * somewhere Cairn cannot see. A block that could never be finished sat in the
 * plan as the "current" one forever, and the day never looked done.
 */
export function blockDone(b: PlanBlock, s: BlockSignals, ticked: Set<string>): boolean {
  if (b.unitSlug) return s.doneUnits.has(b.unitSlug);
  switch (b.kind) {
    case "redo":
      return b.problems.every((p) => !s.redoDue.has(p.slug));
    case "recall":
      return s.cardsDue === 0;
    case "close":
      return s.closed;
    case "aptitude":
      return s.aptitudeToday || ticked.has(b.id);
  }
  if (b.id === "dsa:minimum") return b.problems.some((p) => s.attemptedToday.has(p.slug));
  if (b.id === "dsa:practice") {
    return b.problems.length > 0 && b.problems.every((p) => s.attemptedToday.has(p.slug));
  }
  if (b.kind === "project") {
    return s.deliverablesDone.has(b.id.slice("project:".length)) || ticked.has(b.id);
  }
  if (b.kind === "cadence") {
    return !s.cadenceShort.has(b.id.slice("cadence:".length)) || ticked.has(b.id);
  }
  return ticked.has(b.id);
}

export function signalsFrom(ctx: DayContext): BlockSignals {
  return {
    doneUnits: new Set(ctx.doneUnits ?? []),
    redoDue: new Set(ctx.redo.map((p) => p.slug)),
    cardsDue: ctx.cardsDue ?? 0,
    closed: ctx.closed,
    attemptedToday: new Set(ctx.attemptedToday ?? []),
    aptitudeToday: !!ctx.aptitudeToday,
    deliverablesDone: new Set(ctx.deliverablesDone ?? []),
    cadenceShort: new Set(cadenceDueFor(ctx.journeyWeek, ctx.mocksThisWeek).map((q) => q.kind)),
  };
}

function hydrate(
  plan: DayPlan & { ticked?: string[] },
  ctx: DayContext,
  ticked: Set<string>,
): HydratedPlan {
  const signals = signalsFrom(ctx);
  const blocks: HydratedBlock[] = plan.blocks.map((b) => ({ ...b, done: blockDone(b, signals, ticked) }));

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
    cardsDue: ctx.cardsDue,
    standing: ctx.standing,
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
      return { kind: q.kind, label: q.label, minutes: q.minutes, short: Math.ceil(perWeekFor(q, journeyWeek)) - done };
    })
    .filter((q) => q.short > 0);
}
