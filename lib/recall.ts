import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Grade } from "@/content/review";

/**
 * Spaced repetition, scheduled in ACTIVE days.
 *
 * This is the one decision that makes the deck fit the rest of the product.
 * Every other spaced-repetition system schedules on the calendar, so skipping
 * four days greets you with four days of debt — the exact failure the dated
 * roadmap had, reproduced inside the review surface. Here an interval of 6
 * means "six days on which you actually showed up", so the deck cannot go
 * overdue while you are away. It waits.
 *
 * The algorithm is SM-2 with the ceremony removed — see `content/review.ts`
 * for the four grades and why there are not six.
 */

/** ease never drops below this — a card you keep failing needs rewriting, not a shorter interval */
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
/** an interval longer than this is indistinguishable from "known" over a 90-day journey */
const MAX_INTERVAL = 45;
/** a card answered slowly still grows, but at a fixed rate well below any ease */
const HARD_GROWTH = 1.2;
/** and an instant answer earns more than the ease alone */
const EASY_BONUS = 1.3;

export type CardState = {
  ease: number;
  intervalDays: number;
  lapses: number;
  reviews: number;
};

export type CardSchedule = CardState & { dueDayIndex: number };

/**
 * The next schedule for a card, given how the answer went.
 *
 * `again` is deliberately not a reset to zero: the card comes back on the very
 * next active day, which is soon enough to matter and late enough that you are
 * recalling rather than reading. Resetting the interval to 1 *and* the ease to
 * its floor would punish one bad morning for weeks.
 */
export function schedule(state: CardState, grade: Grade, dayIndex: number): CardSchedule {
  const reviews = state.reviews + 1;

  if (grade === "again") {
    return {
      ease: clamp(state.ease - 0.2, MIN_EASE, MAX_EASE),
      intervalDays: 1,
      lapses: state.lapses + 1,
      reviews,
      dueDayIndex: dayIndex + 1,
    };
  }

  const ease = clamp(
    state.ease + (grade === "hard" ? -0.15 : grade === "easy" ? 0.15 : 0),
    MIN_EASE,
    MAX_EASE,
  );

  // The first two successful reviews use fixed steps rather than the ease
  // multiplier. Multiplying a 1-day interval by 2.5 gives 3 days, which is too
  // soon to prove anything; the standard 1 -> 3 -> ease ladder is better tuned.
  //
  // After that the interval grows by a multiplier chosen per grade. `hard`
  // still grows — the card was answered, so it is better known than it was —
  // but at a fixed modest rate rather than by the ease, so a struggle is
  // rewarded with a shorter next gap than a clean recall would earn.
  const growth = grade === "hard" ? HARD_GROWTH : grade === "easy" ? ease * EASY_BONUS : ease;

  const next =
    state.reviews === 0
      ? grade === "easy"
        ? 4
        : 1
      : state.reviews === 1
        ? grade === "easy"
          ? 8
          : 3
        : Math.round(state.intervalDays * growth);

  const intervalDays = clamp(Math.max(1, next), 1, MAX_INTERVAL);

  return { ease, intervalDays, lapses: state.lapses, reviews, dueDayIndex: dayIndex + intervalDays };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * How well the deck is actually held, as three buckets.
 *
 * `new` has never been graded, `learning` is under a week of active days, and
 * `held` is everything spaced further out than that. The point of showing it
 * is that a deck of 200 cards all sitting at interval 1 is not progress, and
 * a single "cards due" number hides that completely.
 */
export function deckBuckets(cards: { reviews: number; intervalDays: number }[]) {
  let fresh = 0;
  let learning = 0;
  let held = 0;
  for (const c of cards) {
    if (c.reviews === 0) fresh++;
    else if (c.intervalDays < 7) learning++;
    else held++;
  }
  return { fresh, learning, held, total: cards.length };
}

/* ------------------------------------------------------------------ *
 * the data layer
 * ------------------------------------------------------------------ */

export type DueCard = {
  id: number;
  front: string;
  back: string;
  unitSlug: string | null;
  unitTitle: string | null;
  moduleTitle: string | null;
  ease: number;
  intervalDays: number;
  lapses: number;
  reviews: number;
  dueDayIndex: number;
};

export type RecallDeck = {
  dayIndex: number;
  due: DueCard[];
  buckets: ReturnType<typeof deckBuckets>;
  /** cards that exist but are not due yet — the deck is working, not empty */
  scheduled: number;
};

/** how many cards one sitting may hold. A queue you cannot finish stops being a queue. */
export const DAILY_CARD_CAP = 20;

/**
 * The deck, in one round trip.
 *
 * Due cards, the bucket counts over the whole deck, and today's day_index all
 * come back from a single statement — the same discipline as every other read
 * in this app, for the same reason.
 */
export async function getRecallDeck(userId: string): Promise<RecallDeck> {
  const res = await db.execute<{ data: RecallDeck & { buckets: null } }>(sql`
    with day as (
      select coalesce(max(day_index), 0) as day_index
      from journey_days where user_id = ${userId}
    ),
    mine as (
      select f.*, u.title as unit_title, m.title as module_title
      from flashcards f
      left join units u on u.slug = f.unit_slug
      left join modules m on m.slug = u.module_slug
      where f.user_id = ${userId}
    )
    select json_build_object(
      'dayIndex', (select day_index from day),
      'due', coalesce((
        select json_agg(json_build_object(
          'id', id, 'front', front, 'back', back,
          'unitSlug', unit_slug, 'unitTitle', unit_title, 'moduleTitle', module_title,
          'ease', ease, 'intervalDays', interval_days, 'lapses', lapses,
          'reviews', reviews, 'dueDayIndex', due_day_index
        ) order by due_day_index, id)
        from (
          select * from mine, day d
          where mine.due_day_index <= d.day_index
          order by mine.due_day_index, mine.id
          limit ${DAILY_CARD_CAP}
        ) q
      ), '[]'::json),
      'all', coalesce((
        select json_agg(json_build_object('reviews', reviews, 'intervalDays', interval_days))
        from mine
      ), '[]'::json),
      'scheduled', (
        select count(*)::int from mine, day d where mine.due_day_index > d.day_index
      )
    ) as data
  `);

  const raw = res.rows[0]!.data as unknown as {
    dayIndex: number;
    due: DueCard[];
    all: { reviews: number; intervalDays: number }[];
    scheduled: number;
  };

  return {
    dayIndex: Number(raw.dayIndex ?? 0),
    due: raw.due ?? [],
    buckets: deckBuckets(raw.all ?? []),
    scheduled: Number(raw.scheduled ?? 0),
  };
}
