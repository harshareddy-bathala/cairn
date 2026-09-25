import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * The additive schema changes, applied to a database that already has data.
 *
 * `drizzle-kit push` is not usable here: it needs a TTY, and it still wants to
 * drop and recreate the primary keys on `accounts` and `verification_tokens`,
 * which would sign everyone out. So each change `db/schema.ts` gains is written
 * down here as SQL that is safe to run twice, and the whole list runs in one
 * transaction — a half-applied migration is worse than none.
 *
 * Deploy order when this file changes: `npm run migrate`, then deploy the code,
 * then `npm run seed`. `npm run db:check` confirms the columns line up.
 *
 * Each step runs once per database: `schema_migrations` records the ones that
 * have been applied. Append to STEPS; never rename or edit a step that has
 * already run somewhere — a changed step is a new step.
 */

type Step = { name: string; sql: ReturnType<typeof sql> };

const STEPS: Step[] = [
  {
    name: "quiz_sessions",
    sql: sql`
      create table if not exists quiz_sessions (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        kind text not null,
        subject_slug text not null,
        seed integer not null,
        question_ids jsonb not null,
        started_at timestamp not null default now(),
        deadline_at timestamp,
        submitted_at timestamp
      );
      create index if not exists quiz_sessions_user_idx
        on quiz_sessions (user_id, kind, subject_slug);
    `,
  },
  {
    name: "hint_reveals",
    sql: sql`
      create table if not exists hint_reveals (
        user_id text not null references users(id) on delete cascade,
        problem_slug text not null references problems(slug) on delete cascade,
        revealed_at timestamp not null default now(),
        primary key (user_id, problem_slug)
      );
    `,
  },
  {
    // A reveal used to be stored as a `hinted` attempt with no minutes, which
    // every solved-count read as a solve. Only the ones no real outcome ever
    // followed are moved; the rest were superseded and are harmless history.
    name: "hint_reveals: move reveal-only attempts",
    sql: sql`
      with phantom as (
        delete from problem_attempts a
        where a.outcome = 'hinted' and a.hint_revealed and a.minutes is null
          and not exists (
            select 1 from problem_attempts b
            where b.user_id = a.user_id and b.problem_slug = a.problem_slug and b.id <> a.id
          )
        returning a.user_id, a.problem_slug, a.created_at
      )
      insert into hint_reveals (user_id, problem_slug, revealed_at)
      select user_id, problem_slug, created_at from phantom
      on conflict do nothing;
    `,
  },
  {
    // the first certificate issued is the one that has been shared
    name: "certificates: one per user and phase",
    sql: sql`
      delete from certificates c
      using certificates k
      where c.user_id = k.user_id and c.phase_slug = k.phase_slug
        and (c.issued_on, c.id) > (k.issued_on, k.id);
      create unique index if not exists certificates_user_phase_idx
        on certificates (user_id, phase_slug);
    `,
  },
  {
    // the most recently edited story is the one the person was working on
    name: "star_stories: one per user and prompt",
    sql: sql`
      delete from star_stories s
      using star_stories k
      where s.user_id = k.user_id and s.prompt = k.prompt
        and (s.updated_at, s.id) < (k.updated_at, k.id);
      create unique index if not exists star_stories_user_prompt_idx
        on star_stories (user_id, prompt);
    `,
  },
  {
    // a unit's plain-words on-ramp, and what to do on each resource's page
    name: "units.primer_md, resources.steps",
    sql: sql`
      alter table units add column if not exists primer_md text not null default '';
      alter table resources add column if not exists steps jsonb not null default '[]'::jsonb;
    `,
  },
];

async function main() {
  let applied = 0;
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamp not null default now()
      )
    `);
    const done = await tx.execute<{ name: string }>(sql`select name from schema_migrations`);
    const seen = new Set(done.rows.map((r) => r.name));
    for (const step of STEPS) {
      if (seen.has(step.name)) {
        console.log(`--   ${step.name}`);
        continue;
      }
      await tx.execute(step.sql);
      await tx.execute(sql`insert into schema_migrations (name) values (${step.name})`);
      console.log(`ok   ${step.name}`);
      applied++;
    }
  });
  console.log(`\n${applied} applied, ${STEPS.length - applied} already in place — npm run db:check to confirm`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
