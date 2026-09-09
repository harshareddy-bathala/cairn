import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Readout } from "@/components/instrument/readout";
import { BurnGauge } from "@/components/instrument/burn-gauge";
import { Boot, BootItem } from "@/components/instrument/boot";
import { getJourneyState, getNextUnits } from "@/lib/journey";

export const metadata = { title: "Today" };

const TRACK_LABEL: Record<string, string> = {
  dsa: "dsa",
  devops: "ops",
  sde: "sde",
  corecs: "cs",
};

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyState(session.user.id);
  const next = await getNextUnits(session.user.id, ["dsa", "devops", "sde", "corecs"]);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header className="flex items-end justify-between gap-6">
          <div>
            <p className="legend">
              day {String(journey.dayIndex).padStart(3, "0")} · week{" "}
              {String(journey.journeyWeek).padStart(2, "0")}
            </p>
            <h1 className="mt-1 text-2xl text-hi">
              {journey.dayIndex === 0 ? "Trailhead" : "Today"}
            </h1>
          </div>
          <p className="max-w-xs text-right text-2xs leading-relaxed text-lo">
            no dates, no overdue. the only number that moves is the one you move.
          </p>
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
                tone={
                  journey.atTrailhead
                    ? "neutral"
                    : journey.velocity >= journey.requiredVelocity
                      ? "ok"
                      : "warn"
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
                note={`of ~90`}
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
        <Panel legend="next up" aux="planner lands day 4">
          {next.length === 0 ? (
            <p className="text-sm text-lo">Nothing seeded yet. Run <code>npm run seed</code>.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {next.map((u) => (
                <li key={u.unitSlug} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="legend w-8 shrink-0 text-phos-dim">
                    {TRACK_LABEL[u.trackSlug] ?? u.trackSlug}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-hi">{u.unitTitle}</span>
                    <span className="block truncate text-2xs text-lo">{u.moduleTitle}</span>
                  </span>
                  <span className="legend shrink-0 tabular-nums">~{u.estMinutes}m</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </BootItem>
    </Boot>
  );
}
