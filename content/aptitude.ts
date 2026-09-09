/**
 * The daily aptitude drill — 25 questions, timed, every day.
 *
 * This is the one lane the roadmap marks pass/fail: companies gate on it before
 * a human ever reads your code. It is also the lane that dies quietly, because
 * there is no repo to show for it. So it is generated into every plan, it is
 * never trimmed to fit the budget, and the topic is chosen for you.
 *
 * Topics are §5 of the roadmap verbatim. The rotation cycles pool-by-pool so a
 * week always touches quant, reasoning and verbal rather than grinding one.
 */

export const APTITUDE_POOLS = {
  quant: [
    "percentages",
    "ratio & proportion",
    "averages",
    "profit & loss",
    "simple & compound interest",
    "time, speed & distance",
    "time & work",
    "pipes & cisterns",
    "permutations & combinations",
    "probability",
    "number systems",
    "LCM & HCF",
    "mixtures & alligations",
    "ages",
    "calendars & clocks",
  ],
  reasoning: [
    "series",
    "coding-decoding",
    "blood relations",
    "directions",
    "syllogisms",
    "seating arrangement",
    "puzzles",
    "data interpretation",
  ],
  verbal: [
    "reading comprehension",
    "error spotting",
    "synonyms & antonyms",
    "sentence completion",
    "para jumbles",
  ],
} as const;

export type AptitudePool = keyof typeof APTITUDE_POOLS;

const POOL_ORDER: AptitudePool[] = ["quant", "reasoning", "verbal"];

/** Deterministic: the same journey day always draws the same topic. */
export function aptitudeTopicFor(dayIndex: number): { pool: AptitudePool; topic: string } {
  const i = Math.max(0, dayIndex - 1);
  const pool = POOL_ORDER[i % POOL_ORDER.length];
  const nth = Math.floor(i / POOL_ORDER.length);
  const list = APTITUDE_POOLS[pool];
  return { pool, topic: list[nth % list.length] };
}

/** Where the drill actually happens. Practice sites, not another course. */
export const APTITUDE_SOURCES = [
  { title: "IndiaBix", url: "https://www.indiabix.com/aptitude/questions-and-answers/" },
  { title: "PrepInsta", url: "https://prepinsta.com/aptitude/" },
] as const;
