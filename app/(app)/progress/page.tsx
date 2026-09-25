import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Panel } from "@/components/instrument/panel";
import { Readout } from "@/components/instrument/readout";
import { Sparkline } from "@/components/instrument/sparkline";
import { Boot, BootItem } from "@/components/instrument/boot";
import { HandleClaim } from "@/components/instrument/handle-claim";
import { getCertificationState, shapeCertification } from "@/lib/certification";
import { getJourneyStateCached } from "@/lib/journey";
import { aptitudeTrend, getMetrics } from "@/lib/sidetracks";
import {
  APPLICATIONS_FROM_WEEK,
  APPLICATIONS_PER_WEEK,
  CADENCE,
  perWeekFor,
  DSA_CURVE,
  dsaTargetAt,
  STAR_PROMPTS,
  STAR_READY_TARGET,
} from "@/content/cadence";
import { fmtDay, fmtMin, fmtWeek } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";

export const metadata = { title: "Progress" };

/**
 * Progress — where the journey stands, in one read.
 *
 * Metrics and the certification standings used to be separate destinations,
 * and the question they answer is the same one: am I on track? The per-module
 * checkpoint list and the cohort are a tab away; this page carries only the
 * summary of each.
 */
export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyStateCached(session.user.id);
  const [m, cert, [me]] = await Promise.all([
    getMetrics(session.user.id, journey.journeyWeek),
    getCertificationState(session.user.id),
    db.select({ handle: users.handle }).from(users).where(eq(users.id, session.user.id)),
  ]);
  const standings = shapeCertification(cert).standings.filter((s) => s.checkpointsTotal > 0);

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
    const target = Math.ceil(perWeekFor(q, journey.journeyWeek));
    return { ...q, done, target, short: Math.max(0, target - done) };
  });

  const appsOpen = m.appsByStatus.filter(
    (s) => s.status !== "rejected" && s.status !== "ghosted",
  );

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
      <BootItem>
        <header>
          <p className="legend">
            {fmtDay(journey.dayIndex)} · {fmtWeek(journey.journeyWeek)}
          </p>
          <h1 className="mt-1 text-2xl text-hi">Progress</h1>
          <p className="mt-1 max-w-xl note text-lo">
            Whether you are on track, in one read: the DSA curve, each phase&rsquo;s
            checkpoints, and the lanes with nothing else to show for them — aptitude has no
            repo and applications leave no commit, so they are the first to disappear.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel
          legend="dsa"
          aux={
            activeDays === 0
              ? `first mark ~${firstMark.target} by ${fmtDay(firstMark.atDay)}`
              : `target ~${dsaTarget} by ${fmtDay(activeDays)}`
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
              <p className="note text-lo">
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
          legend="phases"
          aux={
            <Link href={ROUTES.certification} className="tap hover:text-hi">
              certification →
            </Link>
          }
        >
          <ul className="divide-y divide-line-soft">
            {standings.map((s) => (
              <li key={s.phaseSlug} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                {/* on a phone the title takes its own line — the three counts
                    beside it left "Depth & Automation" cut to a stub */}
                <span className="min-w-0 basis-full truncate text-sm text-hi sm:flex-1 sm:basis-0">
                  {s.title}
                </span>
                <span className="legend tabular-nums">
                  {s.unitsDone}/{s.unitsTotal} units
                </span>
                <span className="legend tabular-nums">
                  {s.checkpointsPassed}/{s.checkpointsTotal} checkpoints
                </span>
                <span
                  className={cn(
                    "legend ml-auto text-right sm:w-28",
                    s.certificateId ? "text-phos" : s.examUnlocked && "text-warn",
                  )}
                >
                  {s.certificateId ? "◈ certified" : s.examUnlocked ? "exam open" : "exam locked"}
                </span>
              </li>
            ))}
          </ul>
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
          <p className="note text-lo">
            {trend.length
              ? "Each drill is logged from its block on Today, or on the "
              : "Nothing logged yet. Log a drill from its block on Today, or on the "}
            <Link href={ROUTES.aptitude} className="text-info underline underline-offset-[3px]">
              aptitude desk
            </Link>
            , which keeps the full history.
          </p>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="cadence" aux={`journey ${fmtWeek(journey.journeyWeek)}`}>
          <p className="mb-3 note text-lo">
            Per journey week, not per calendar week — skip three days and the week simply
            has not ended yet.
          </p>
          <ul className="divide-y divide-line-soft">
            {due.map((q) => (
              <li key={q.kind} className="flex items-baseline gap-3 py-2">
                <span className={cnTone(q.short === 0)} aria-hidden>
                  {q.short === 0 ? "✓" : "▸"}
                </span>
                <span className="sr-only">{q.short === 0 ? "met:" : "outstanding:"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-hi">{q.label}</span>
                  <span className="block note text-lo">{q.why}</span>
                </span>
                <span className="legend shrink-0 tabular-nums">
                  {q.done}/{q.target}
                </span>
              </li>
            ))}
          </ul>
          <p className="note mt-3 text-lo">
            Log a session on the{" "}
            <Link href={ROUTES.career} className="text-info underline underline-offset-[3px]">
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
                <p className="note text-lo">Close a few days and the shape appears here.</p>
              )}
              <p className="note text-lo">
                Minutes are the one number that cannot be gamed by reading more and
                finishing less.
              </p>
            </div>
          </div>
        </Panel>
      </BootItem>
      <BootItem>
        <Panel legend="public profile">
          <HandleClaim handle={me?.handle ?? null} />
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
