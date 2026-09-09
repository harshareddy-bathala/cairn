/**
 * Everything that is measured per journey week rather than per day.
 *
 * A journey week is 7 active days, so these quotas self-correct instead of
 * piling up as guilt: skip three calendar days and the week simply hasn't
 * ended yet.
 */

/**
 * The pacing constant lives here, not in lib/journey, because this module is
 * imported by client components — anything under lib/ reaches the database and
 * would drag pg into the browser bundle.
 */
export const TARGET_ACTIVE_DAYS = 90;

export type Quota = {
  kind: "dsa_pair" | "tech_mcq" | "coding_round" | "full_mock" | "hr" | "system_design";
  label: string;
  /** how many per journey week; a fractional target means alternate weeks */
  perWeek: number;
  minutes: number;
  why: string;
  /** the journey week this obligation starts applying */
  fromWeek: number;
};

export const CADENCE: Quota[] = [
  {
    kind: "dsa_pair",
    label: "Timed DSA pair",
    perWeek: 2,
    minutes: 45,
    why: "Two problems under a hard 45-minute clock, no editorial, no phone. Solving is not the skill being trained here — solving under a clock is.",
    fromWeek: 1,
  },
  {
    kind: "tech_mcq",
    label: "Technical MCQ set",
    perWeek: 1,
    minutes: 20,
    why: "20 questions rotating through OS, DBMS, CN, OOP and Linux. Online assessments are mostly this, and they are pass/fail before a human sees you.",
    fromWeek: 1,
  },
  {
    kind: "coding_round",
    label: "Full coding round",
    perWeek: 0.5,
    minutes: 90,
    why: "Alternates with the full assessment. Do a live contest at least every other one — a real clock and a leaderboard train your nervous system, not your algorithms.",
    fromWeek: 1,
  },
  {
    kind: "hr",
    label: "Out-loud HR answers",
    perWeek: 1,
    minutes: 15,
    why: "Recorded on your phone. Companies at this band reject for communication far more often than for DSA.",
    fromWeek: 1,
  },
  {
    kind: "full_mock",
    label: "Full mock interview",
    perWeek: 1,
    minutes: 45,
    why: "A senior, a teacher, a friend, or solo out-loud and recorded. Most people start these too late and discover in October that they freeze.",
    fromWeek: 6,
  },
  {
    kind: "system_design",
    label: "System design, out loud",
    perWeek: 1,
    minutes: 45,
    why: "Three done well beats six done badly — this is cut fifth when you fall behind, never first.",
    fromWeek: 9,
  },
];

/** applications per journey week once the off-campus lane opens */
export const APPLICATIONS_PER_WEEK = 5;
export const APPLICATIONS_FROM_WEEK = 8;

/**
 * The DSA curve: ~95 by the end of Phase 1, ~165 by Phase 2, ~230 by Phase 3.
 * Expressed in active days so it never becomes a calendar deadline.
 */
export const DSA_CURVE = [
  { atDay: Math.round(TARGET_ACTIVE_DAYS / 3), target: 95, label: "phase 1" },
  { atDay: Math.round((TARGET_ACTIVE_DAYS * 2) / 3), target: 165, label: "phase 2" },
  { atDay: TARGET_ACTIVE_DAYS, target: 230, label: "phase 3" },
];

/** how many problems you should have solved by a given active day */
export function dsaTargetAt(dayIndex: number) {
  if (dayIndex <= 0) return 0;
  let prevDay = 0;
  let prevTarget = 0;
  for (const p of DSA_CURVE) {
    if (dayIndex <= p.atDay) {
      const t = (dayIndex - prevDay) / (p.atDay - prevDay);
      return Math.round(prevTarget + t * (p.target - prevTarget));
    }
    prevDay = p.atDay;
    prevTarget = p.target;
  }
  return prevTarget;
}

/**
 * The behavioural questions worth having a real answer to.
 *
 * Six by the time Phase 2 ends. "Tell me about yourself" is first because it
 * sets the tone for everything after it.
 */
export const STAR_PROMPTS = [
  "Tell me about yourself — 90 seconds: who you are, what you've built, what you want, why this company.",
  "Walk me through your best project. Have a 60-second, a 3-minute and a 10-minute version.",
  "A time you failed, and what you changed afterwards.",
  "A conflict on a team, and how it actually resolved.",
  "A time you led — you lead a team of three, so this one is real.",
  "Your biggest weakness: a real one, plus what you are actively doing about it.",
  "Why this role, why DevOps, why this company.",
  "A time you had to learn something hard, fast.",
];
