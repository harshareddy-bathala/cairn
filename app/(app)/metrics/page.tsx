import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Readout } from "@/components/instrument/readout";
import { Sparkline } from "@/components/instrument/sparkline";
import { Boot, BootItem } from "@/components/instrument/boot";
import { AptitudeLog } from "@/components/instrument/aptitude-log";
import { getJourneyStateCached } from "@/lib/journey";
import { aptitudeTrend, getMetrics } from "@/lib/sidetracks";
import {
  APPLICATIONS_FROM_WEEK,
  APPLICATIONS_PER_WEEK,
  CADENCE,
  DSA_CURVE,
  dsaTargetAt,
  STAR_PROMPTS,
  STAR_READY_TARGET,
} from "@/content/cadence";
import { fmtMin } from "@/lib/format";

export const metadata = { title: "Metrics" };

export default async function MetricsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyStateCached(session.user.id);
  const day = Math.max(journey.dayIndex, 1);
  const m = await getMetrics(session.user.id, journey.journeyWeek);

  // At the trailhead the curve has not started, and "target ~0 by day 0" is
  // noise dressed as a number. Show the first real mark instead.
  const activeDays = journey.stones.length;
  const dsaTarget = dsaTargetAt(activeDays);
  const dsaAhead = m.dsaSolved >= dsaTarget;
  const firstMark = DSA_CURVE[0];
  const trend = aptitudeTrend(m.aptitude);
  const aptAvg = trend.length ? Math.round(trend.reduce((a, b) => a + b, 0) / trend.length) : null;
  const minutes = m.minutesByDay.map((d) => d.minutes);

  const due = CADENCE.filter((q) => journey.journeyWeek >= q.fromWeek).map((q) => {
    const done = m.mocksThisWeek.find((x) => x.kind === q.kind)?.n ?? 0;
    return { ...q, done, short: Math.max(0, Math.ceil(q.perWeek) - done) };
  });

  const appsOpen = m.appsByStatus.filter(
    (s) => s.status !== "rejected" && s.status !== "ghosted",
  );

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header>
          <p className="legend">
            day {String(journey.dayIndex).padStart(3, "0")} · week{" "}
            {String(journey.journeyWeek).padStart(2, "0")}
          </p>
          <h1 className="mt-1 text-2xl text-hi">Metrics</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            The lanes with nothing to show for them. Aptitude has no repo and five
            applications leave no commit, so they are the first to disappear — these are
            the numbers that notice.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel
          legend="dsa"
          aux={
            activeDays === 0
              ? `first mark ~${firstMark.target} by day ${String(firstMark.atDay).padStart(3, "0")}`
              : `target ~${dsaTarget} by day ${String(activeDays).padStart(3, "0")}`
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Readout
                label="solved"
                value={m.dsaSolved}
                note={activeDays === 0 ? "the curve starts when you do" : `of ~${dsaTarget} due`}
                tone={activeDays === 0 ? "neutral" : dsaAhead ? "ok" : "warn"}
              />
              <Readout label="clean" value={m.dsaClean} note="no hint, no editorial" tone="neutral" />
              <Readout
                label="redo open"
                value={m.redoOpen}
                tone={m.redoOpen > 6 ? "warn" : "neutral"}
              />
            </div>
            <div className="flex flex-col justify-center gap-1.5 border-l border-line-soft pl-4 sm:pl-5">
              <p className="legend">the curve</p>
              <p className="text-2xs leading-relaxed text-lo">
                95 by the end of Foundations, 165 by Depth, 230 by Orchestration — measured
                in active days, so a skipped week moves the target with you rather than
                leaving you behind it.
              </p>
            </div>
          </div>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel
          legend="aptitude"
          aux={
            aptAvg != null
              ? `${aptAvg}% · ${trend.length} ${trend.length === 1 ? "score" : "scores"}`
              : "no scores yet"
          }
        >
          {trend.length > 1 && (
            <div className="mb-3 flex items-center gap-3 border-b border-line-soft pb-3">
              <span className="legend">trend</span>
              <Sparkline
                data={trend}
                width={160}
                height={20}
                tone={aptAvg != null && aptAvg >= 70 ? "ok" : aptAvg != null && aptAvg >= 50 ? "warn" : "bad"}
              />
              <span className="legend tabular-nums">{trend[trend.length - 1]}%</span>
            </div>
          )}
          <AptitudeLog dayIndex={day} scores={m.aptitude} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="cadence" aux={`journey week ${String(journey.journeyWeek).padStart(2, "0")}`}>
          <p className="mb-3 text-2xs leading-relaxed text-lo">
            Per journey week, not per calendar week — skip three days and the week simply
            has not ended yet.
          </p>
          <ul className="divide-y divide-line-soft">
            {due.map((q) => (
              <li key={q.kind} className="flex items-baseline gap-3 py-2">
                <span
                  className={cnTone(q.short === 0)}
                  aria-label={q.short === 0 ? "met" : "outstanding"}
                >
                  {q.short === 0 ? "✓" : "▸"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-hi">{q.label}</span>
                  <span className="block text-2xs leading-relaxed text-lo">{q.why}</span>
                </span>
                <span className="legend shrink-0 tabular-nums">
                  {q.done}/{Math.ceil(q.perWeek)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-lo">
            Log a session on the{" "}
            <Link href="/career" className="text-info underline underline-offset-[3px]">
              career desk
            </Link>
            .
          </p>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="output" aux={`${fmtMin(m.minutesTotal)} logged`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Readout
                label="applications"
                value={m.applications}
                note={
                  journey.journeyWeek >= APPLICATIONS_FROM_WEEK
                    ? `${m.applicationsThisWeek}/${APPLICATIONS_PER_WEEK} this week`
                    : `opens week ${APPLICATIONS_FROM_WEEK}`
                }
                // zero applications once the lane is open is the quiet failure
                tone={
                  journey.journeyWeek < APPLICATIONS_FROM_WEEK
                    ? "neutral"
                    : m.applicationsThisWeek >= APPLICATIONS_PER_WEEK
                      ? "ok"
                      : m.applicationsThisWeek === 0
                        ? "bad"
                        : "warn"
                }
              />
              <Readout label="live conversations" value={appsOpen.reduce((n, s) => n + s.n, 0)} tone="neutral" />
              <Readout label="contacts" value={m.contacts} tone="neutral" />
              <Readout
                label="star stories"
                value={`${Math.min(m.starReady, STAR_READY_TARGET)}/${STAR_READY_TARGET}`}
                note={`${STAR_READY_TARGET} of ${STAR_PROMPTS.length} prompts`}
                tone={m.starReady >= STAR_READY_TARGET ? "ok" : "neutral"}
              />
              <Readout
                label="deliverables"
                value={`${m.deliverablesDone}/${m.deliverablesTotal}`}
                tone={m.deliverablesDone > 0 ? "ok" : "neutral"}
              />
            </div>
            <div className="flex flex-col justify-center gap-2 border-l border-line-soft pl-4 sm:pl-5">
              <p className="legend">
                {minutes.length > 1 ? `minutes, last ${minutes.length} closed days` : "minutes per day"}
              </p>
              {minutes.length > 1 ? (
                <Sparkline
                  data={minutes}
                  width={200}
                  height={28}
                  tone="neutral"
                  label={`minutes per day over the last ${minutes.length} closed days, ${minutes.join(", ")}`}
                />
              ) : (
                <p className="text-2xs text-lo">Close a few days and the shape appears here.</p>
              )}
              <p className="text-2xs leading-relaxed text-lo">
                Minutes are the one number that cannot be gamed by reading more and
                finishing less.
              </p>
            </div>
          </div>
        </Panel>
      </BootItem>
    </Boot>
  );
}

function cnTone(met: boolean) {
  return met
    ? "w-4 shrink-0 text-center text-sm leading-none text-phos"
    : "w-4 shrink-0 text-center text-sm leading-none text-lo";
}
