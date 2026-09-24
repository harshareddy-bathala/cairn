import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dsaSolvedSql } from "@/lib/progress";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { Cairn } from "@/components/instrument/cairn";
import { cn } from "@/lib/cn";

export const metadata = { title: "Cohort" };

type Member = {
  id: string | null;
  /** stable per invite, without being the address */
  key: string;
  /**
   * Masked unless it is your own row. Everyone on the page is invited, but an
   * invite is not consent to have your address shown to the others — and a
   * name or handle is what identifies someone here anyway.
   */
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
          'id', u.id, 'key', md5(lower(a.email)),
          'email', case when u.id = ${session.user.id} then a.email
                   else left(a.email, 1) || '•••@' || split_part(a.email, '@', 2) end,
          'name', u.name, 'handle', u.handle,
          'activeDays', coalesce((select count(*)::int from journey_days
            where user_id = u.id and closed_at is not null), 0),
          'unitsDone', coalesce((select count(*)::int from unit_progress
            where user_id = u.id and state = 'done'), 0),
          'problemsSolved', coalesce(${dsaSolvedSql(sql`u.id`)}, 0),
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
      -- the e2e account (scripts/e2e-account.mjs) is not a person
      where a.email not like '%@cairn.local'
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
          <p className="mt-1 max-w-xl note text-lo">
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
                /*
                 * On a phone the three counts drop to their own line under the
                 * name. Inline, they took ~200px of a 358px row and left the
                 * name five characters and the status one word per line.
                 *
                 * Someone not yet arrived is dimmed by colour, not opacity —
                 * opacity took their status line to 2.4:1.
                 */
                <li
                  key={m.key}
                  className="flex items-start gap-3 px-4 py-3 sm:items-center sm:gap-4"
                >
                  <div className="w-8 shrink-0 pt-1.5 sm:pt-0">
                    <Cairn stones={m.stones} max={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", joined ? "text-hi" : "text-mid")}>
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
                    <p className={cn("text-xs", stale ? "text-lo" : "text-phos-dim")}>
                      {!joined
                        ? "invited — has not signed in"
                        : m.lastDate == null
                          ? "signed in, no day closed yet"
                          : stale
                            ? `last closed ${m.lastDate}`
                            : "closed recently"}
                    </p>
                    <p className="legend mt-1.5 flex gap-4 tabular-nums sm:hidden">
                      <span>{plural(m.activeDays, "day")}</span>
                      <span>{plural(m.unitsDone, "unit")}</span>
                      <span>{m.problemsSolved} dsa</span>
                    </p>
                  </div>
                  <span className="legend hidden shrink-0 tabular-nums sm:inline">
                    {plural(m.activeDays, "day")}
                  </span>
                  <span className="legend hidden w-16 shrink-0 text-right tabular-nums sm:inline">
                    {plural(m.unitsDone, "unit")}
                  </span>
                  <span className="legend hidden w-16 shrink-0 text-right tabular-nums sm:inline">
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

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

function daysBetween(a: string, b: string) {
  return Math.abs(Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
}
