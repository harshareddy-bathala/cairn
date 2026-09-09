import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { modules, problems, tracks, unitProgress, units } from "@/db/schema";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { cn } from "@/lib/cn";
import { CHECKPOINT_PASS, questionsForModule } from "@/content/checkpoints";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [m] = await db.select({ title: modules.title }).from(modules).where(eq(modules.slug, slug));
  return { title: m?.title ?? "Module" };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;
  const { slug } = await params;

  const [mod] = await db
    .select({
      slug: modules.slug,
      title: modules.title,
      summary: modules.summary,
      trackName: tracks.name,
      trackGlyph: tracks.glyph,
    })
    .from(modules)
    .innerJoin(tracks, eq(modules.trackSlug, tracks.slug))
    .where(eq(modules.slug, slug));

  if (!mod) notFound();

  const [unitRows, problemCount] = await Promise.all([
    db
      .select({
        slug: units.slug,
        title: units.title,
        objective: units.objective,
        estMinutes: units.estMinutes,
        order: units.order,
        state: unitProgress.state,
      })
      .from(units)
      .leftJoin(
        unitProgress,
        and(eq(unitProgress.unitSlug, units.slug), eq(unitProgress.userId, userId)),
      )
      .where(eq(units.moduleSlug, slug))
      .orderBy(asc(units.order)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(problems)
      .where(eq(problems.moduleSlug, slug)),
  ]);

  const done = unitRows.filter((u) => u.state === "done").length;
  const totalMin = unitRows.reduce((a, u) => a + u.estMinutes, 0);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header>
          <Link href="/roadmap" className="tap legend hover:text-mid">
            ← the trail
          </Link>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-phos-dim">{mod.trackGlyph}</span>
            <span className="legend">{mod.trackName}</span>
          </div>
          <h1 className="mt-1 text-2xl leading-tight text-hi">{mod.title}</h1>
          <p className="prose-cairn mt-3 text-base">{mod.summary}</p>
        </header>
      </BootItem>

      <BootItem>
        <Panel
          legend="units"
          aux={`${done}/${unitRows.length} · ~${Math.round(totalMin / 60)}h · ${problemCount[0]?.n ?? 0} problems`}
          flush
        >
          <ul className="divide-y divide-line-soft">
            {unitRows.map((u) => (
              <li key={u.slug}>
                <Link
                  href={`/unit/${u.slug}`}
                  className="flex items-baseline gap-3 px-4 py-3 transition-colors duration-[120ms] hover:bg-ink-800/50"
                >
                  <span
                    className={cn(
                      "shrink-0 text-2xs tabular-nums",
                      u.state === "done" ? "text-phos" : "text-lo",
                    )}
                  >
                    {u.state === "done" ? "✓" : String(u.order).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-hi">{u.title}</span>
                    <span className="mt-0.5 block text-2xs leading-relaxed text-lo">
                      {u.objective}
                    </span>
                  </span>
                  <span className="legend shrink-0 tabular-nums">~{u.estMinutes}m</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="checkpoint">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-2xs leading-relaxed text-lo">
              {questionsForModule(slug).length} questions,{" "}
              {Math.round(CHECKPOINT_PASS * 100)}% to pass. It gates the phase certificate,
              never the curriculum — and every question explains itself afterwards.
            </p>
            <Link
              href={`/checkpoint/${slug}`}
              className="shrink-0 rounded-[3px] border border-line px-3 py-1.5 text-2xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos"
            >
              take the checkpoint
            </Link>
          </div>
        </Panel>
      </BootItem>
    </Boot>
  );
}
