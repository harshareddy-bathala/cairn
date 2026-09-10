/**
 * The review vocabulary — the four grades and the four weekly prompts.
 *
 * This lives in `content/` rather than `lib/` for the same reason the
 * curriculum does: it is authored text that both the server and the browser
 * need, and everything in `lib/` that touches the deck also touches the
 * database. A client component importing a *value* from one of those modules
 * drags `pg` into the browser bundle, so the shared words live here where
 * nothing can reach a connection pool.
 */

export type Grade = "again" | "hard" | "good" | "easy";

/**
 * Four grades, not six.
 *
 * SM-2's original scale asks a self-grader to distinguish a 3 from a 4, which
 * they cannot do reliably — so the extra resolution is noise wearing the
 * costume of precision. Four choices map onto things a person can actually
 * tell apart about their own recall.
 */
export const GRADES: { grade: Grade; label: string; hint: string; key: string }[] = [
  { grade: "again", label: "Again", hint: "could not answer it", key: "1" },
  { grade: "hard", label: "Hard", hint: "got there, slowly", key: "2" },
  { grade: "good", label: "Good", hint: "answered it", key: "3" },
  { grade: "easy", label: "Easy", hint: "instant", key: "4" },
];

/**
 * The journey-week review.
 *
 * Four questions, asked once every seven active days. The count is deliberate:
 * a review long enough to feel like homework is a review that gets skipped, and
 * a skipped review is worth less than a short one.
 *
 * Every prompt is answerable from evidence the app already holds, so none can
 * be answered with a mood. "Did I work hard this week" is not a question;
 * "which unit could you not explain out loud" is.
 */
export const WEEK_REVIEW_PROMPTS = [
  {
    id: "explain",
    label: "What could you not explain out loud?",
    help: "Pick one thing you ticked done and could not defend for sixty seconds. That is next week's first block.",
  },
  {
    id: "cost",
    label: "What cost more time than it was worth?",
    help: "A resource, a rabbit hole, a problem you should have taken the editorial on two hours earlier.",
  },
  {
    id: "worked",
    label: "What actually worked?",
    help: "The thing worth repeating deliberately next week rather than by accident.",
  },
  {
    id: "lane",
    label: "Which lane went quiet?",
    help: "Aptitude, applications and the project are the lanes that vanish without anyone noticing. Name the one that did.",
  },
] as const;

export type WeekReviewPromptId = (typeof WEEK_REVIEW_PROMPTS)[number]["id"];

/**
 * A review is offered from the fifth active day of a journey week.
 *
 * Waiting for the seventh means it only ever appears on the day you are most
 * likely to be tired, and it cannot influence the week it is reviewing. Offered
 * on day five, the three priorities it produces still have two days to land.
 */
export const REVIEW_OPENS_ON_DAY = 5;
