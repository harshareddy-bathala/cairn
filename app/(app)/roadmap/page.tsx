import { redirect } from "next/navigation";
import { asc, eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { modules, phases, tracks, unitProgress, units } from "@/db/schema";
import Link from "next/link";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { cn } from "@/lib/cn";

export const metadata = { title: "Trail" };

export default async function RoadmapPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const [phaseRows, trackRows, moduleRows] = await Promise.all([
    db.select().from(phases).orderBy(asc(phases.order)),
    db.select().from(tracks).orderBy(asc(tracks.order)),
    db
      .select({
        slug: modules.slug,
        title: modules.title,
        summary: modules.summary,
        trackSlug: modules.trackSlug,
        phaseSlug: modules.phaseSlug,
        order: modules.order,
        prereqSlugs: modules.prereqSlugs,
        total: sql<number>`count(${units.slug})::int`,
        done: sql<number>`count(*) filter (where ${unitProgress.state} = 'done')::int`,
      })
      .from(modules)
      .leftJoin(units, eq(units.moduleSlug, modules.slug))
      .leftJoin(
        unitProgress,
        and(eq(unitProgress.unitSlug, units.slug), eq(unitProgress.userId, userId)),
      )
      .groupBy(modules.slug)
      .orderBy(asc(modules.order)),
  ]);

  return (
    <Boot className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">the trail</p>
          <h1 className="mt-1 text-2xl text-hi">Three phases, no dates</h1>
          <p className="prose-cairn mt-3 text-base">
            A phase is a place on the trail, not a month. You advance by finishing it.
          </p>
        </header>
      </BootItem>

      {phaseRows.map((phase) => {
        const inPhase = moduleRows.filter((m) => m.phaseSlug === phase.slug);
        return (
          <BootItem key={phase.slug}>
            <Panel
              legend={`phase ${phase.order} · ${phase.title}`}
              aux={inPhase.length ? `${inPhase.length} modules` : "not authored yet"}
            >
              <p className="prose-cairn mb-4 text-base">{phase.mission}</p>
              {inPhase.length === 0 ? (
                <p className="text-2xs text-lo">Content pass B fills this in.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {inPhase.map((m) => {
                    const track = trackRows.find((t) => t.slug === m.trackSlug);
                    const pct = m.total ? m.done / m.total : 0;
                    // soft gate: prerequisites are advice, never a lock. Falling
                    // behind must never wall you out of the map.
                    const blocking = (m.prereqSlugs ?? [])
                      .map((ps) => moduleRows.find((x) => x.slug === ps))
                      .filter((x) => x && x.done < x.total);
                    return (
                      <li key={m.slug}>
                        <Link
                          href={`/module/${m.slug}`}
                          className="group flex h-full flex-col rounded-[3px] border border-line-soft bg-ink-900/40 p-3 transition-colors duration-[120ms] hover:border-line">
                          <div className="flex items-center gap-2">
                            <span className="text-phos-dim">{track?.glyph}</span>
                            <span className="legend">{track?.name}</span>
                            <span className="legend ml-auto tabular-nums">
                              {m.done}/{m.total}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm text-hi">{m.title}</p>
                          <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-lo">
                            {m.summary}
                          </p>
                          {blocking.length > 0 && (
                            <p className="mt-1.5 text-2xs text-info">
                              reads better after {blocking.map((b) => b!.title).join(", ")}
                            </p>
                          )}
                          <div className="mt-3 flex gap-[2px]" aria-hidden>
                            {Array.from({ length: Math.max(m.total, 1) }, (_, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "h-1 flex-1 rounded-[1px]",
                                  i < m.done ? "bg-phos" : "bg-ink-800",
                                )}
                              />
                            ))}
                          </div>
                          <span className="sr-only">{Math.round(pct * 100)}% complete</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </BootItem>
        );
      })}
    </Boot>
  );
}
