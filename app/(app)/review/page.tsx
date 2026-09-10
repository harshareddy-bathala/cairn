import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { RecallDeck } from "@/components/instrument/recall-deck";
import { PastReviews, WeekReviewForm } from "@/components/instrument/week-review";
import { getJourneyStateCached } from "@/lib/journey";
import { getRecallDeck, DAILY_CARD_CAP } from "@/lib/recall";
import { getWeekReviewState } from "@/lib/week-review";
import { REVIEW_OPENS_ON_DAY } from "@/content/review";
import { getMisses } from "@/lib/misses";
import { getRedoQueue } from "@/lib/progress";
import { cn } from "@/lib/cn";

export const metadata = { title: "Review" };

/**
 * The surface for everything you already learned once.
 *
 * The rest of the app is about moving forward — the plan, the trail, the
 * certification. This page is the only one that looks backwards, and it exists
 * because forward motion over 90 days quietly loses more than it gains if
 * nothing ever comes back.
 *
 * Four things come back, in the order they cost you an interview:
 *  1. recall cards, spaced by active day
 *  2. the redo queue — problems you already believed were done
 *  3. checkpoint misses, with the explanation you did not read the first time
 *  4. the journey-week review, every seven active days
 */
export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const journey = await getJourneyStateCached(userId);
  const [deck, week, misses, redo] = await Promise.all([
    getRecallDeck(userId),
    getWeekReviewState(userId),
    getMisses(userId),
    getRedoQueue(userId, Math.max(journey.dayIndex, 0)),
  ]);

  const nothingYet = deck.buckets.total === 0 && misses.length === 0 && redo.length === 0;

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">
            day {String(journey.dayIndex).padStart(3, "0")} · week{" "}
            {String(journey.journeyWeek).padStart(2, "0")}
          </p>
          <h1 className="mt-1 text-2xl text-hi">Review</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            Everything here is spaced in <span className="text-mid">active days</span>, not
            calendar days. Skip a week and nothing is overdue waiting for you — the deck
            simply picks up where you left it.
          </p>
        </header>
      </BootItem>

      {nothingYet ? (
        <BootItem>
          <Panel legend="nothing to review yet">
            <p className="prose-cairn text-base">
              This page fills itself. Finishing a unit adds its recall cards to the deck,
              opening an editorial schedules a redo, and a missed checkpoint question comes
              back here with its explanation.
            </p>
            <p className="mt-3 text-2xs text-lo">
              <Link
                href="/today"
                className="text-info underline underline-offset-[3px] hover:text-phos"
              >
                Go and close a day
              </Link>{" "}
              — the first cards arrive tomorrow.
            </p>
          </Panel>
        </BootItem>
      ) : (
        <BootItem>
          <Panel
            legend="deck"
            aux={
              deck.due.length
                ? `${deck.due.length}${deck.due.length === DAILY_CARD_CAP ? "+" : ""} due`
                : `${deck.scheduled} scheduled`
            }
            active={deck.due.length > 0}
          >
            <RecallDeck cards={deck.due} dayIndex={deck.dayIndex} />

            {deck.buckets.total > 0 && (
              /*
               * A stat strip rather than three Readouts. Readout is a
               * label-left / value-right row, which is right in a narrow panel
               * and wrong in a three-column grid — at full width the label and
               * its number end up 300px apart and the three columns read as
               * one run-on sentence. Here the label sits above its number.
               *
               * The three buckets exist because "cards due" alone hides the
               * thing worth knowing: a deck of 200 cards all sitting at
               * interval 1 is not progress.
               */
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-3.5">
                <Bucket label="new" value={deck.buckets.fresh} note="never graded" />
                <Bucket label="learning" value={deck.buckets.learning} note="under 7d" />
                <Bucket
                  label="held"
                  value={deck.buckets.held}
                  note="7d+"
                  tone={deck.buckets.held > 0 ? "text-phos" : undefined}
                />
              </dl>
            )}
          </Panel>
        </BootItem>
      )}

      {redo.length > 0 && (
        <BootItem>
          <Panel legend="redo queue" aux={`${redo.length} due`}>
            <p className="mb-3 text-2xs leading-relaxed text-lo">
              Problems you opened the editorial on, or did not finish. They are already in
              today&apos;s plan — this is the whole list, including any past the plan&apos;s cap.
            </p>
            <ul className="space-y-2">
              {redo.map((p) => (
                <li
                  key={p.problemSlug}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-l-2 border-bad pl-3"
                >
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-hi underline-offset-4 hover:underline"
                  >
                    {p.title}
                  </a>
                  <span className="legend">{p.patternTag}</span>
                  <span
                    className={cn(
                      "legend",
                      p.difficulty === "hard"
                        ? "text-bad"
                        : p.difficulty === "medium"
                          ? "text-warn"
                          : "text-phos-dim",
                    )}
                  >
                    {p.difficulty}
                  </span>
                  {p.unitSlug && (
                    <Link
                      href={`/unit/${p.unitSlug}`}
                      className="tap legend ml-auto hover:text-mid"
                    >
                      unit ›
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </BootItem>
      )}

      {misses.length > 0 && (
        <BootItem>
          <Panel legend="checkpoint misses" aux={`${misses.length} open`}>
            <p className="mb-3 text-2xs leading-relaxed text-lo">
              Questions you currently get wrong. Answering one correctly on a later attempt
              removes it from here — so this list is what you do not know yet, not a record
              of what you once got wrong.
            </p>
            <ul className="space-y-3">
              {misses.map((m) => (
                <li key={m.id} className="border-l-2 border-warn pl-3">
                  <details className="group">
                    <summary className="tap cursor-pointer list-none">
                      <span className="flex items-baseline gap-2">
                        <span className="legend shrink-0">{m.moduleTitle}</span>
                        {m.times > 1 && (
                          <span className="legend shrink-0 text-bad tabular-nums">
                            ×{m.times}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-lo transition-transform duration-[120ms] group-open:rotate-90">
                          ›
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-hi">
                        {m.prompt}
                      </span>
                    </summary>

                    <ol className="mt-2 space-y-1">
                      {m.options.map((o, i) => (
                        <li
                          key={i}
                          className={cn(
                            "flex items-baseline gap-2 text-2xs leading-relaxed",
                            i === m.answer
                              ? "text-phos"
                              : i === m.chose
                                ? "text-bad"
                                : "text-lo",
                          )}
                        >
                          <span className="w-3 shrink-0">
                            {i === m.answer ? "✓" : i === m.chose ? "✕" : "·"}
                          </span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ol>

                    <p className="prose-cairn mt-2.5 text-base">{m.why}</p>
                    <Link
                      href={`/checkpoint/${m.moduleSlug}`}
                      className="tap legend mt-2 inline-block hover:text-mid"
                    >
                      retake this checkpoint ›
                    </Link>
                  </details>
                </li>
              ))}
            </ul>
          </Panel>
        </BootItem>
      )}

      <BootItem>
        <Panel
          legend={`journey week ${week.currentWeek} review`}
          aux={week.existing ? "recorded" : week.due ? "open" : `opens on day ${REVIEW_OPENS_ON_DAY}`}
          active={week.due && !week.existing}
        >
          {week.due || week.existing ? (
            <WeekReviewForm
              journeyWeek={week.currentWeek}
              existing={week.existing}
              dayOfWeek={week.dayOfWeek}
            />
          ) : (
            <p className="text-2xs leading-relaxed text-lo">
              Opens on active day {REVIEW_OPENS_ON_DAY} of this journey week — you are on day{" "}
              <span className="text-mid tabular-nums">{week.dayOfWeek}</span>. Early enough
              that the three priorities it produces still have days left to land.
            </p>
          )}
        </Panel>
      </BootItem>

      {week.past.length > 0 && (
        <BootItem>
          <Panel legend="past reviews" aux={`${week.past.length} weeks`}>
            <PastReviews reviews={week.past} />
          </Panel>
        </BootItem>
      )}
    </Boot>
  );
}

function Bucket({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone?: string;
}) {
  return (
    <div>
      <dt className="legend">{label}</dt>
      <dd className={cn("mt-0.5 text-xl tabular-nums", tone ?? "text-hi")}>{value}</dd>
      <dd className="text-2xs text-lo">{note}</dd>
    </div>
  );
}
