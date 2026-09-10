import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { Cairn } from "@/components/instrument/cairn";
import { cn } from "@/lib/cn";

export const metadata = { title: "Cohort" };

type Member = {
  id: string | null;
  email: string;
  name: string | null;
  handle: string | null;
  activeDays: number;
  unitsDone: number;
  problemsSolved: number;
  lastDate: string | null;
  stones: { dayIndex: number; mode: "normal" | "catchup" | "bad_day" }[];
};

/**
 * Everyone on the allowlist, and how far along they are.
 *
 * Driven from `allowed_emails`, not from `users`: an invite only becomes a
 * `users` row when that person first signs in, so joining from the user table
 * made everyone invisible until they showed up — the one moment a cohort page
 * is actually worth looking at. Someone invited and not yet arrived is a real
 * state, and it is shown as one.
 *
 * Every number is read live and scoped by `user_id`, so a reset empties that
 * person's row here the moment it happens, and a new invite appears without
 * anything else being touched.
 *
 * Deliberately not a feed. No posts, no comments, no reactions — the only
 * social pressure worth having here is that someone else can see whether you
 * closed yesterday.
 */
export default async function CohortPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const res = await db.execute<{ data: Member[] }>(sql`
    select coalesce(json_agg(t.m order by t.joined desc, t.active_days desc, t.email), '[]'::json) as data
    from (
      select a.email,
        u.id is not null as joined,
        coalesce((select count(*)::int from journey_days
          where user_id = u.id and closed_at is not null), 0) as active_days,
        json_build_object(
          'id', u.id, 'email', a.email, 'name', u.name, 'handle', u.handle,
          'activeDays', coalesce((select count(*)::int from journey_days
            where user_id = u.id and closed_at is not null), 0),
          'unitsDone', coalesce((select count(*)::int from unit_progress
            where user_id = u.id and state = 'done'), 0),
          'problemsSolved', coalesce((select count(distinct problem_slug)::int
            from problem_attempts
            where user_id = u.id and outcome in ('clean', 'hinted')), 0),
          'lastDate', (select max(calendar_date) from journey_days
            where user_id = u.id and closed_at is not null),
          'stones', coalesce((
            select json_agg(json_build_object('dayIndex', day_index, 'mode', mode)
              order by day_index)
            from journey_days where user_id = u.id and closed_at is not null
          ), '[]'::json)
        ) as m
      from allowed_emails a
      left join users u on lower(u.email) = lower(a.email)
    ) t
  `);

  const members = res.rows[0]!.data;
  const me = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">
            {members.filter((m) => m.id != null).length} on the trail · {members.length} invited
          </p>
          <h1 className="mt-1 text-2xl text-hi">Cohort</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            No feed, no posts, no reactions. The only useful social pressure is that
            someone else can see whether you closed yesterday.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="standing" flush>
          <ul className="divide-y divide-line-soft">
            {members.map((m) => {
              const joined = m.id != null;
              const stale = m.lastDate == null || daysBetween(m.lastDate, today) > 1;
              const label = m.name ?? m.handle ?? m.email;
              return (
                <li
                  key={m.email}
                  className={cn("flex items-center gap-4 px-4 py-3", !joined && "opacity-60")}
                >
                  <div className="w-8 shrink-0">
                    <Cairn stones={m.stones} max={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-hi">
                      {m.handle ? (
                        <Link
                          href={`/u/${m.handle}`}
                          className="transition-colors duration-[120ms] hover:text-phos"
                        >
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                      {m.id === me && <span className="legend ml-2 text-phos-dim">you</span>}
                    </p>
                    <p className={cn("text-2xs", stale ? "text-lo" : "text-phos-dim")}>
                      {!joined
                        ? "invited — has not signed in"
                        : m.lastDate == null
                          ? "signed in, no day closed yet"
                          : stale
                            ? `last closed ${m.lastDate}`
                            : "closed recently"}
                    </p>
                  </div>
                  <span className="legend shrink-0 tabular-nums">{m.activeDays} days</span>
                  <span className="legend w-16 shrink-0 text-right tabular-nums">
                    {m.unitsDone} units
                  </span>
                  <span className="legend w-16 shrink-0 text-right tabular-nums">
                    {m.problemsSolved} dsa
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </BootItem>

    </Boot>
  );
}

function daysBetween(a: string, b: string) {
  return Math.abs(Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
}
