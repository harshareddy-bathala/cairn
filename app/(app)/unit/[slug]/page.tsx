import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { hintReveals, modules, problemAttempts, problems, resources, unitProgress, units } from "@/db/schema";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { ProblemList } from "@/components/instrument/problem-list";
import { Markdown } from "@/components/instrument/markdown";
import { UnitComplete } from "@/components/instrument/unit-complete";
import { SelfCheck } from "@/components/instrument/self-check";
import { cn } from "@/lib/cn";

const KIND_GLYPH: Record<string, string> = {
  read: "▤", watch: "▷", do: "▶", lab: "⌘", docs: "▦",
};
/** what the page asks of you, said before you open it */
const KIND_VERB: Record<string, string> = {
  read: "read", watch: "watch", do: "work through", lab: "hands-on", docs: "reference",
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
      primerMd: units.primerMd,
      conceptMd: units.conceptMd,
      pitfalls: units.pitfalls,
      interviewAngle: units.interviewAngle,
      recall: units.recall,
      moduleSlug: modules.slug,
      moduleTitle: modules.title,
      trackSlug: modules.trackSlug,
    })
    .from(units)
    .innerJoin(modules, eq(units.moduleSlug, modules.slug))
    .where(eq(units.slug, slug));

  if (!unit) notFound();

  const [res, probs, progress, attempts, reveals, siblings] = await Promise.all([
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
    // hints opened that no outcome has consumed yet
    db
      .select({ problemSlug: hintReveals.problemSlug })
      .from(hintReveals)
      .where(eq(hintReveals.userId, session.user.id)),
    db
      .select({ slug: units.slug, title: units.title })
      .from(units)
      .where(eq(units.moduleSlug, unit.moduleSlug))
      .orderBy(asc(units.order)),
  ]);
  const next = siblings[siblings.findIndex((u) => u.slug === slug) + 1] ?? null;
  const pendingReveal = new Set(reveals.map((r) => r.problemSlug));

  // last attempt wins; an earlier revealed hint stays revealed
  const latest = new Map<string, (typeof attempts)[number] & { everRevealed: boolean }>();
  for (const a of attempts) {
    const prev = latest.get(a.problemSlug);
    latest.set(a.problemSlug, { ...a, everRevealed: Boolean(prev?.everRevealed || a.hintRevealed) });
  }

  // The page is a path, in the order a first-timer should take it: the idea in
  // plain words, then one resource that teaches it, then the notes that sharpen
  // it for an interview. It used to open on the notes — written for someone
  // who already knew the topic — with the resources at the bottom.
  const primary = res.find((r) => r.isPrimary) ?? null;
  const others = res.filter((r) => r !== primary);
  const sections = [
    unit.primerMd.trim() && "primer",
    res.length > 0 && "learn",
    (unit.conceptMd || unit.pitfalls.length > 0 || unit.interviewAngle) && "notes",
    unit.recall.length > 0 && "check",
    probs.length > 0 && "practice",
    "finish",
  ].filter((k): k is string => Boolean(k));

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <Link href={`/module/${unit.moduleSlug}`} className="tap legend hover:text-mid">
            ← {unit.moduleTitle}
          </Link>
          <h1 className="mt-2 text-2xl leading-tight text-hi">{unit.title}</h1>
          <p className="prose-cairn mt-2 text-base">{unit.objective}</p>
          <p className="legend mt-3 tabular-nums">~{unit.estMinutes} min</p>
        </header>
      </BootItem>

      {sections.map((key, i) => {
        const n = i + 1;
        if (key === "primer")
          return (
            <BootItem key={key}>
              <Panel legend={`${n} · start here`}>
                <Markdown source={unit.primerMd} />
              </Panel>
            </BootItem>
          );
        if (key === "learn")
          return (
            <BootItem key={key}>
              <Panel
                legend={`${n} · learn it`}
                aux={primary?.minutes ? `~${primary.minutes} min` : undefined}
              >
                {primary && <PrimaryResource r={primary} />}
                {others.length > 0 && (
                  <div className={cn(primary && "mt-5 border-t border-line-soft pt-4")}>
                    <h3 className="legend">also for this unit</h3>
                    <ul className="mt-2.5 space-y-3">
                      {others.map((r) => (
                        <li key={r.id}>
                          <ResourceLink r={r} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            </BootItem>
          );
        if (key === "notes")
          return (
            <BootItem key={key}>
              <Panel legend={`${n} · the notes`}>
                <p className="mb-4 note text-lo">
                  Read after step {n - 1}. These are the exact rules and the traps an
                  interviewer probes — the part a tutorial skims.
                </p>
                {unit.conceptMd && <Markdown source={unit.conceptMd} />}
                {unit.pitfalls.length > 0 && (
                  <div className={cn(unit.conceptMd && "mt-6 border-t border-line-soft pt-4")}>
                    <h3 className="legend">where this goes wrong</h3>
                    <ul className="mt-2.5 space-y-2.5">
                      {unit.pitfalls.map((x, j) => (
                        <li key={j} className="flex gap-2.5">
                          <span className="mt-[3px] shrink-0 text-2xs text-warn" aria-hidden>
                            ▲
                          </span>
                          <Markdown source={x} className="text-base" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {unit.interviewAngle && (
                  <div className="mt-6 border-t border-line-soft pt-4">
                    <h3 className="legend">in the room</h3>
                    <Markdown source={unit.interviewAngle} className="mt-2 text-base" />
                  </div>
                )}
              </Panel>
            </BootItem>
          );
        if (key === "check")
          return (
            <BootItem key={key}>
              <SelfCheck cards={unit.recall} legend={`${n} · check yourself`} />
            </BootItem>
          );
        if (key === "practice")
          return (
            <BootItem key={key}>
              <Panel legend={`${n} · practice`} aux={`${probs.length} problems`}>
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
                    hintRevealed:
                      pendingReveal.has(p.slug) || (latest.get(p.slug)?.everRevealed ?? false),
                    redoDueDay: latest.get(p.slug)?.redoClearedAt
                      ? null
                      : (latest.get(p.slug)?.redoDueDay ?? null),
                  }))}
                />
              </Panel>
            </BootItem>
          );
        return (
          <BootItem key={key}>
            <Panel legend={`${n} · finish`} active={progress[0]?.state !== "done"}>
              <UnitComplete
                unitSlug={unit.slug}
                done={progress[0]?.state === "done"}
                completedOnDayIndex={progress[0]?.completedOnDayIndex}
                next={next}
                moduleSlug={unit.moduleSlug}
              />
            </Panel>
          </BootItem>
        );
      })}
    </Boot>
  );
}

type Res = typeof resources.$inferSelect;

/** the one page this unit sends you to, and what to do once it is open */
function PrimaryResource({ r }: { r: Res }) {
  return (
    <div>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-baseline gap-2.5"
      >
        <span className="shrink-0 text-2xs text-phos" aria-hidden>
          {KIND_GLYPH[r.kind] ?? "▦"}
        </span>
        <span className="min-w-0">
          <span className="legend block text-phos-dim">{KIND_VERB[r.kind] ?? r.kind}</span>
          <span className="mt-0.5 block text-base text-hi underline-offset-4 group-hover:underline">
            {r.title} <span className="text-lo" aria-hidden>↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
        </span>
      </a>
      <p className="mt-1.5 pl-5 note text-mid">{r.whyThisOne}</p>
      {r.steps.length > 0 && (
        <div className="mt-3.5 pl-5">
          <h3 className="legend">on that page</h3>
          <ol className="mt-2 space-y-1.5">
            {r.steps.map((st, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-4 shrink-0 text-right text-2xs tabular-nums leading-6 text-phos-dim">
                  {i + 1}.
                </span>
                <Markdown source={st} className="min-w-0 text-base" />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** a secondary resource: the link, why it is here and, if it has them, its steps */
function ResourceLink({ r }: { r: Res }) {
  return (
    <div>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-baseline gap-2.5"
      >
        <span className="shrink-0 text-2xs text-lo" aria-hidden>
          {KIND_GLYPH[r.kind] ?? "▦"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 text-sm text-hi underline-offset-4 group-hover:underline">
              {r.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </span>
            {r.minutes && (
              <span className="legend ml-auto shrink-0 tabular-nums">~{r.minutes}m</span>
            )}
          </span>
        </span>
      </a>
      <p className="mt-0.5 pl-5 note text-lo">{r.whyThisOne}</p>
      {r.steps.length > 0 && (
        <p className="mt-1 pl-5 note text-lo">
          {r.steps.map((st, i) => (
            <span key={i}>
              <span className="tabular-nums text-mid">{i + 1}.</span> {st}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
