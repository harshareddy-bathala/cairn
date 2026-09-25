/**
 * The daily aptitude drill — 25 questions, timed, every day.
 *
 * This is the one lane that is graded pass/fail: companies gate on it before
 * a human ever reads your code. It is also the lane that dies quietly, because
 * there is no repo to show for it. So it is generated into every plan, it is
 * never trimmed to fit the budget, and the topic is chosen for you.
 *
 * The topic list is fixed. The rotation cycles pool-by-pool so a
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

const IB = "https://www.indiabix.com/";

/**
 * The practice page for each topic — the exact set of questions, not a site's
 * front door.
 *
 * The drill used to link two home pages, so "25 questions on percentages"
 * started with finding percentages among forty topics on someone else's menu.
 * Typed against the pools above, so a topic added there without a page here
 * does not compile.
 */
export const APTITUDE_PRACTICE: {
  [P in AptitudePool]: Record<(typeof APTITUDE_POOLS)[P][number], string>;
} = {
  quant: {
    "percentages": IB + "aptitude/percentage/",
    "ratio & proportion": IB + "aptitude/ratio-and-proportion/",
    "averages": IB + "aptitude/average/",
    "profit & loss": IB + "aptitude/profit-and-loss/",
    "simple & compound interest": IB + "aptitude/simple-interest/",
    "time, speed & distance": IB + "aptitude/time-and-distance/",
    "time & work": IB + "aptitude/time-and-work/",
    "pipes & cisterns": IB + "aptitude/pipes-and-cistern/",
    "permutations & combinations": IB + "aptitude/permutation-and-combination/",
    "probability": IB + "aptitude/probability/",
    "number systems": IB + "aptitude/numbers/",
    "LCM & HCF": IB + "aptitude/problems-on-hcf-and-lcm/",
    "mixtures & alligations": IB + "aptitude/alligation-or-mixture/",
    "ages": IB + "aptitude/problems-on-ages/",
    "calendars & clocks": IB + "aptitude/calendar/",
  },
  reasoning: {
    "series": IB + "logical-reasoning/number-series/",
    "coding-decoding": "https://www.geeksforgeeks.org/aptitude/coding-decoding/",
    "blood relations": IB + "verbal-reasoning/blood-relation-test/",
    "directions": IB + "verbal-reasoning/direction-sense-test/",
    "syllogisms": IB + "verbal-reasoning/syllogism/",
    "seating arrangement": IB + "verbal-reasoning/seating-arrangement/",
    "puzzles": IB + "logical-reasoning/logical-games/",
    "data interpretation": IB + "data-interpretation/table-charts/",
  },
  verbal: {
    "reading comprehension": IB + "verbal-ability/comprehension/",
    "error spotting": IB + "verbal-ability/spotting-errors/",
    "synonyms & antonyms": IB + "verbal-ability/synonyms/",
    "sentence completion": IB + "verbal-ability/completing-statements/",
    "para jumbles": IB + "verbal-ability/ordering-of-sentences/",
  },
};

/** the practice page for a topic, or null for one the map does not know */
export function practiceUrlFor(pool: AptitudePool, topic: string): string | null {
  return (APTITUDE_PRACTICE[pool] as Record<string, string>)[topic] ?? null;
}

/** any topic's practice page, whichever pool it is in — for logged topics */
export function practiceUrlForTopic(topic: string): string | null {
  for (const pool of POOL_ORDER) {
    const url = practiceUrlFor(pool, topic);
    if (url) return url;
  }
  return null;
}

/** Each pool's section, for drilling something other than today's topic. */
export const APTITUDE_SOURCES = [
  { title: "quant", url: IB + "aptitude/questions-and-answers/" },
  { title: "reasoning", url: IB + "verbal-reasoning/questions-and-answers/" },
  { title: "verbal", url: IB + "verbal-ability/questions-and-answers/" },
] as const;
