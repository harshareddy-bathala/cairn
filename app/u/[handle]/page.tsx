import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { Panel } from "@/components/instrument/panel";
import { Readout } from "@/components/instrument/readout";
import { Cairn } from "@/components/instrument/cairn";
import { phases } from "@/content";

export const metadata = { title: "Profile" };

type Profile = {
  name: string | null;
  handle: string;
  activeDays: number;
  unitsDone: number;
  unitsTotal: number;
  problemsClean: number;
  problemsSolved: number;
  deliverables: number;
  stones: { dayIndex: number; mode: "normal" | "catchup" | "bad_day" }[];
  certificates: { id: string; phaseSlug: string; issuedOn: string }[];
  modulesPassed: { slug: string; title: string; phaseSlug: string }[];
};

/**
 * The public profile.
 *
 * Only verifiable things appear here: modules whose checkpoint was passed,
 * problems actually solved, days actually closed. No self-reported skill
 * levels, no percentages of a thing nobody else can see.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const res = await db.execute<{ data: Profile | null }>(sql`
    select (
      select json_build_object(
        'name', u.name, 'handle', u.handle,
        'activeDays', (
          select count(*)::int from journey_days
          where user_id = u.id and closed_at is not null
        ),
        'unitsDone', (
          select count(*)::int from unit_progress
          where user_id = u.id and state = 'done'
        ),
        'unitsTotal', (select count(*)::int from units),
        'problemsClean', (
          select count(distinct problem_slug)::int from problem_attempts
          where user_id = u.id and outcome = 'clean'
        ),
        'problemsSolved', (
          select count(distinct problem_slug)::int from problem_attempts
          where user_id = u.id and outcome in ('clean', 'hinted')
        ),
        'deliverables', (
          select count(*)::int from deliverable_done where user_id = u.id
        ),
        'stones', coalesce((
          select json_agg(json_build_object('dayIndex', day_index, 'mode', mode)
            order by day_index)
          from journey_days where user_id = u.id and closed_at is not null
        ), '[]'::json),
        'certificates', coalesce((
          select json_agg(json_build_object(
            'id', id, 'phaseSlug', phase_slug,
            'issuedOn', to_char(issued_on, 'YYYY-MM-DD')
          ) order by issued_on)
          from certificates where user_id = u.id
        ), '[]'::json),
        'modulesPassed', coalesce((
          select json_agg(distinct jsonb_build_object(
            'slug', m.slug, 'title', m.title, 'phaseSlug', m.phase_slug
          ))
          from checkpoint_attempts ca
          join modules m on m.slug = ca.module_slug
          where ca.user_id = u.id and ca.passed
        ), '[]'::json)
      )
      from users u where u.handle = ${handle}
    ) as data
  `);

  const p = res.rows[0]?.data;
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-14">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="legend">/u/{p.handle}</p>
          <h1 className="mt-1 text-2xl text-hi">{p.name ?? p.handle}</h1>
          <p className="mt-1 text-2xs leading-relaxed text-lo">
            Everything here is verifiable — checkpoints passed, problems solved, days
            closed. Nothing is self-assessed.
          </p>
        </div>
        <div className="w-14 shrink-0">
          <Cairn stones={p.stones} max={28} />
        </div>
      </header>

      <Panel legend="record" aux={`${p.activeDays} active days`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Readout label="units" value={`${p.unitsDone}/${p.unitsTotal}`} tone="ok" />
          <Readout label="problems solved" value={p.problemsSolved} tone="neutral" />
          <Readout label="solved clean" value={p.problemsClean} note="no hint, no editorial" tone="ok" />
          <Readout label="project deliverables" value={p.deliverables} tone="neutral" />
        </div>
      </Panel>

      {p.certificates.length > 0 && (
        <Panel legend="certificates">
          <ul className="divide-y divide-line-soft">
            {p.certificates.map((c) => (
              <li key={c.id} className="flex items-baseline gap-3 py-2">
                <span className="w-4 shrink-0 text-center text-sm text-phos" aria-hidden>
                  ◈
                </span>
                <Link
                  href={`/c/${c.id}`}
                  className="min-w-0 flex-1 truncate text-sm text-hi transition-colors duration-[120ms] hover:text-phos"
                >
                  {phases.find((ph) => ph.slug === c.phaseSlug)?.title ?? c.phaseSlug}
                </Link>
                <span className="legend shrink-0 tabular-nums">{c.issuedOn}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {p.modulesPassed.length > 0 && (
        <Panel legend="verified modules" aux={`${p.modulesPassed.length}`}>
          <ul className="flex flex-wrap gap-1.5">
            {p.modulesPassed.map((m) => (
              <li
                key={m.slug}
                className="rounded-[3px] border border-line-soft px-2 py-1 text-2xs text-mid"
              >
                {m.title}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="text-2xs text-lo">
        Tracked with <span className="text-mid">cairn</span> — a stack of stones that marks
        a trail where there is no signposted path.
      </p>
    </main>
  );
}
