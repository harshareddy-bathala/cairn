import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Sparkline } from "@/components/instrument/sparkline";
import { Boot, BootItem } from "@/components/instrument/boot";
import { AptitudeLog } from "@/components/instrument/aptitude-log";
import { getJourneyStateCached } from "@/lib/journey";
import { aptitudeByTopic, aptitudeTrend, getAptitude } from "@/lib/sidetracks";
import { APTITUDE_SOURCES, aptitudeTopicFor, practiceUrlFor, practiceUrlForTopic } from "@/content/aptitude";
import { fmtDay } from "@/lib/format";
import { cn } from "@/lib/cn";
import { scoreBand, scoreText } from "@/lib/marks";

export const metadata = { title: "Aptitude" };

/**
 * The aptitude desk: today's drill, the log, and which topics keep going wrong.
 *
 * Logging happens from Today's aptitude block most days. This page is for the
 * week-scale view — the rotation is fixed, so the only lever is spending extra
 * drills on the topics at the bottom of the list.
 */
export default async function AptitudePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyStateCached(session.user.id);
  const day = Math.max(journey.dayIndex, 1);
  const scores = await getAptitude(session.user.id);
  const trend = aptitudeTrend(scores);
  const avg = trend.length ? Math.round(trend.reduce((a, b) => a + b, 0) / trend.length) : null;
  const topics = aptitudeByTopic(scores);
  const today = aptitudeTopicFor(day);
  const todayUrl = practiceUrlFor(today.pool, today.topic);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
      <BootItem>
        <header>
          <p className="legend">{fmtDay(journey.dayIndex)} · daily, timed</p>
          <h1 className="mt-1 text-2xl text-hi">Aptitude</h1>
          <p className="mt-1 max-w-xl note text-lo">
            The online test comes before a human ever reads your code. Twenty-five
            questions a day on a fixed rotation, so the lever you have is extra drills
            on the topics that keep going wrong.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel
          legend="log"
          aux={avg != null ? `${avg}% · ${trend.length} ${trend.length === 1 ? "score" : "scores"}` : "no scores yet"}
        >
          <p className="mb-1 note text-mid">
            Today: <span className="text-hi">{today.topic}</span>{" "}
            {todayUrl && (
              <a
                href={todayUrl}
                target="_blank"
                rel="noreferrer"
                className="tap text-info underline underline-offset-[3px]"
              >
                open the questions ↗
              </a>
            )}
          </p>
          <p className="mb-3 flex flex-wrap items-center gap-x-3 note text-lo">
            Other sections
            {APTITUDE_SOURCES.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="tap inline-block py-1 text-xs text-info underline underline-offset-[3px]"
              >
                {s.title} ↗
              </a>
            ))}
          </p>
          {trend.length > 1 && (
            <div className="mb-3 flex items-center gap-3 border-b border-line-soft pb-3">
              <span className="legend">trend</span>
              <Sparkline
                data={trend}
                width={160}
                height={20}
                tone={scoreBand(avg ?? 0)}
                label={`aptitude scores over the last ${trend.length} drills, ${trend.join("%, ")}%`}
              />
              <span className="legend tabular-nums">{trend[trend.length - 1]}%</span>
            </div>
          )}
          <AptitudeLog dayIndex={day} scores={scores} history={14} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="by topic" aux="weakest first">
          {topics.length ? (
            <ul className="divide-y divide-line-soft">
              {topics.map((t) => (
                <li key={t.topic} className="flex items-baseline gap-3 py-1.5">
                  {practiceUrlForTopic(t.topic) ? (
                    <a
                      href={practiceUrlForTopic(t.topic)!}
                      target="_blank"
                      rel="noreferrer"
                      className="tap min-w-0 flex-1 truncate text-sm text-mid underline-offset-4 hover:text-hi hover:underline"
                    >
                      {t.topic}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-mid">{t.topic}</span>
                  )}
                  <span className="legend shrink-0 tabular-nums">
                    {t.n} {t.n === 1 ? "drill" : "drills"}
                  </span>
                  <span className={cn("w-10 shrink-0 text-right text-2xs tabular-nums", scoreText(t.percent))}>
                    {t.percent}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note text-lo">
              Topics show up here once a few drills are logged — the top of this list is
              where extra practice pays.
            </p>
          )}
        </Panel>
      </BootItem>
    </Boot>
  );
}
