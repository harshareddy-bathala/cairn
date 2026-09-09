import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { modules, problemAttempts, problems, resources, unitProgress, units } from "@/db/schema";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { ProblemList } from "@/components/instrument/problem-list";
import { Markdown } from "@/components/instrument/markdown";
import { UnitComplete } from "@/components/instrument/unit-complete";
import { cn } from "@/lib/cn";

const KIND_GLYPH: Record<string, string> = {
  read: "▤", watch: "▷", do: "▶", lab: "⌘", docs: "▦",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [u] = await db.select({ title: units.title }).from(units).where(eq(units.slug, slug));
  return { title: u?.title ?? "Unit" };
}

export default async function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const { slug } = await params;

  const [unit] = await db
    .select({
      slug: units.slug,
      title: units.title,
      objective: units.objective,
      estMinutes: units.estMinutes,
      conceptMd: units.conceptMd,
      moduleSlug: modules.slug,
      moduleTitle: modules.title,
      trackSlug: modules.trackSlug,
    })
    .from(units)
    .innerJoin(modules, eq(units.moduleSlug, modules.slug))
    .where(eq(units.slug, slug));

  if (!unit) notFound();

  const [res, probs, progress, attempts] = await Promise.all([
    db.select().from(resources).where(eq(resources.unitSlug, slug)).orderBy(asc(resources.order)),
    db
      .select()
      .from(problems)
      .where(and(eq(problems.moduleSlug, unit.moduleSlug), eq(problems.unitSlug, slug)))
      .orderBy(asc(problems.order)),
    db
      .select()
      .from(unitProgress)
      .where(and(eq(unitProgress.userId, session.user.id), eq(unitProgress.unitSlug, slug))),
    db
      .select({
        problemSlug: problemAttempts.problemSlug,
        outcome: problemAttempts.outcome,
        hintRevealed: problemAttempts.hintRevealed,
        redoDueDay: problemAttempts.redoDueDay,
        redoClearedAt: problemAttempts.redoClearedAt,
        id: problemAttempts.id,
      })
      .from(problemAttempts)
      .where(eq(problemAttempts.userId, session.user.id))
      .orderBy(asc(problemAttempts.id)),
  ]);

  // last attempt wins; an earlier revealed hint stays revealed
  const latest = new Map<string, (typeof attempts)[number] & { everRevealed: boolean }>();
  for (const a of attempts) {
    const prev = latest.get(a.problemSlug);
    latest.set(a.problemSlug, { ...a, everRevealed: Boolean(prev?.everRevealed || a.hintRevealed) });
  }

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header>
          <Link href="/roadmap" className="legend hover:text-mid">
            ← {unit.moduleTitle}
          </Link>
          <h1 className="mt-2 text-2xl leading-tight text-hi">{unit.title}</h1>
          <p className="prose-cairn mt-2 text-base">{unit.objective}</p>
          <p className="legend mt-3 tabular-nums">~{unit.estMinutes} min</p>
        </header>
      </BootItem>

      {unit.conceptMd && (
        <BootItem>
          <Panel legend="concept">
            <Markdown source={unit.conceptMd} />
          </Panel>
        </BootItem>
      )}

      <BootItem>
        <Panel legend="resources" aux={`${res.length} handpicked`}>
          <ul className="space-y-3">
            {res.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-baseline gap-2.5"
                >
                  <span className={cn("shrink-0 text-2xs", r.isPrimary ? "text-phos" : "text-lo")}>
                    {KIND_GLYPH[r.kind] ?? "▦"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm text-hi underline-offset-4 group-hover:underline">
                        {r.title}
                      </span>
                      {r.isPrimary && <span className="legend shrink-0 text-phos">primary</span>}
                      {r.minutes && (
                        <span className="legend ml-auto shrink-0 tabular-nums">~{r.minutes}m</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-2xs leading-relaxed text-lo">
                      {r.whyThisOne}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="progress" active={progress[0]?.state !== "done"}>
          <UnitComplete
            unitSlug={unit.slug}
            done={progress[0]?.state === "done"}
            completedOnDayIndex={progress[0]?.completedOnDayIndex}
          />
        </Panel>
      </BootItem>

      {probs.length > 0 && (
        <BootItem>
          <Panel legend="practice" aux={`${probs.length} problems`}>
            <ProblemList
              problems={probs.map((p) => ({
                slug: p.slug,
                title: p.title,
                url: p.url,
                platform: p.platform,
                difficulty: p.difficulty,
                patternTag: p.patternTag,
                triggerHint: p.triggerHint,
                approachHint: p.approachHint,
                estMinutes: p.estMinutes,
                isMust: p.isMust,
                outcome: latest.get(p.slug)?.outcome ?? null,
                hintRevealed: latest.get(p.slug)?.everRevealed ?? false,
                redoDueDay: latest.get(p.slug)?.redoClearedAt
                  ? null
                  : (latest.get(p.slug)?.redoDueDay ?? null),
              }))}
            />
          </Panel>
        </BootItem>
      )}
    </Boot>
  );
}
