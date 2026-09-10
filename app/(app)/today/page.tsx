import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Readout } from "@/components/instrument/readout";
import { BurnGauge } from "@/components/instrument/burn-gauge";
import { Boot, BootItem } from "@/components/instrument/boot";
import { PlanList } from "@/components/instrument/plan-list";
import { PaceControl } from "@/components/instrument/pace-control";
import { DayClose } from "@/components/instrument/day-close";
import { getJourneyStateCached } from "@/lib/journey";
import { getTodayPlan } from "@/lib/planner";
import { fmtMin } from "@/lib/format";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyStateCached(session.user.id);
  const today = await getTodayPlan(session.user.id);
  const plan = today.plan;

  const remaining = plan.blocks
    .filter((b) => !b.done && b.kind !== "close")
    .reduce((n, b) => n + b.minutes, 0);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="legend">
              day {String(journey.dayIndex).padStart(3, "0")} · week{" "}
              {String(journey.journeyWeek).padStart(2, "0")}
              {journey.streak > 1 && (
                <span className="text-phos-dim"> · {journey.streak}-day streak</span>
              )}
            </p>
            <h1 className="mt-1 text-2xl text-hi">
              {plan.mode === "bad_day"
                ? "Bad day"
                : journey.dayIndex === 0
                  ? "Trailhead"
                  : "Today"}
            </h1>
          </div>
          <PaceControl
            multiplier={plan.multiplier}
            badDay={plan.mode === "bad_day"}
            disabled={today.closed}
          />
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="status" aux={`${journey.unitsDone}/${journey.unitsTotal} units`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Readout
                label="velocity"
                value={journey.atTrailhead ? "—" : journey.velocity.toFixed(2)}
                unit={journey.atTrailhead ? undefined : "u/d"}
                // the tone follows the pace budget, not an instantaneous
                // comparison — one slow day is not a warning state
                tone={
                  journey.atTrailhead
                    ? "neutral"
                    : journey.paceBudget > 0.5
                      ? "ok"
                      : journey.paceBudget > 0.2
                        ? "warn"
                        : "bad"
                }
              />
              <Readout
                label="required"
                value={journey.requiredVelocity.toFixed(2)}
                unit="u/d"
                tone="neutral"
              />
              <Readout
                label="active days"
                value={journey.stones.length}
                note="of ~90"
                tone="neutral"
              />
            </div>
            {journey.atTrailhead ? (
              <div className="flex flex-col justify-center gap-1.5 border-l border-line-soft pl-4 sm:pl-5">
                <p className="legend">pace budget</p>
                <p className="text-sm text-mid">
                  full — <span className="text-lo">nothing spent yet</span>
                </p>
                <p className="text-2xs leading-relaxed text-lo">
                  Close your first day to set the baseline. Falling behind later never
                  locks anything; it only rebalances the plan.
                </p>
              </div>
            ) : (
              <BurnGauge remaining={journey.paceBudget} />
            )}
          </div>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel
          legend={plan.mode === "bad_day" ? "minimum chain" : "plan"}
          aux={
            today.closed
              ? `${fmtMin(plan.doneMin)} logged`
              : `${fmtMin(remaining)} left · ${fmtMin(today.budgetMin)} budget`
          }
          active={!today.closed}
        >
          {plan.mode === "bad_day" && (
            <p className="mb-3 text-2xs leading-relaxed text-lo">
              One problem and the log. That is a complete day today — the streak does not
              know the difference, and neither will November.
            </p>
          )}
          {plan.multiplier > 1 && plan.mode !== "bad_day" && (
            <p className="mb-3 text-2xs leading-relaxed text-lo">
              Catch-up at {plan.multiplier}× — the blocks marked{" "}
              <span className="text-phos-dim">+</span> are pulled forward from the next day.
            </p>
          )}
          <PlanList blocks={plan.blocks} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend={today.closed ? "closed" : "close the day"}>
          <DayClose
            dayIndex={plan.dayIndex}
            stones={journey.stones}
            closed={today.closed}
            learned={today.learned}
            tomorrowFirstTask={today.tomorrowFirstTask}
            minutes={today.minutesTotal}
            suggestedMinutes={plan.doneMin || undefined}
          />
        </Panel>
      </BootItem>
    </Boot>
  );
}
