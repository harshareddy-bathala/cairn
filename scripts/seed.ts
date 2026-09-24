import { inArray, notInArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as s from "@/db/schema";
import { modules, phases, projects, tracks, validateContent } from "@/content";

/**
 * content/ -> Postgres, in one transaction.
 *
 *   npm run seed                 upsert; report anything content no longer defines
 *   npm run seed -- --dry-run    the same, then roll back — nothing is written
 *   npm run seed -- --prune      also delete stale rows that no progress points at
 *   npm run seed -- --prune --force
 *                                delete stale rows even when progress points at
 *                                them — the cascade takes that progress with it
 *
 * Every progress table hangs off a content row with `on delete cascade`, and dev
 * shares the production branch. So deleting is never the default: renaming a
 * unit's slug used to erase everyone's completion, recall cards and attempts for
 * it the next time anyone ran the seed. Now a stale row stays until it is asked
 * to go, and one that still carries progress needs --force on top of that.
 */

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const PRUNE = args.has("--prune");
const FORCE = args.has("--force");

class DryRun extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Tally = { inserted: number; updated: number; unchanged: number };

/**
 * One multi-row upsert that only rewrites rows whose content actually changed,
 * and says which were new (`xmax = 0` is true only for a freshly inserted row).
 */
async function upsert<T extends PgTable>(
  tx: Tx,
  table: T,
  rows: Record<string, unknown>[],
  target: PgColumn | PgColumn[],
): Promise<Tally> {
  const tally: Tally = { inserted: 0, updated: 0, unchanged: 0 };
  if (!rows.length) return tally;
  const cols = table as unknown as Record<string, PgColumn>;
  const keys = Object.keys(rows[0]!);

  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const set = Object.fromEntries(keys.map((k) => [k, sql.raw(`excluded."${cols[k]!.name}"`)]));
    const mine = sql.join(keys.map((k) => sql`${cols[k]}`), sql`, `);
    const theirs = sql.join(keys.map((k) => sql.raw(`excluded."${cols[k]!.name}"`)), sql`, `);
    const res = await tx
      .insert(table)
      .values(chunk as never)
      .onConflictDoUpdate({
        target,
        set: set as never,
        setWhere: sql`(${mine}) is distinct from (${theirs})`,
      })
      .returning({ inserted: sql<boolean>`xmax = 0` });
    const ins = res.filter((r) => r.inserted).length;
    tally.inserted += ins;
    tally.updated += res.length - ins;
    tally.unchanged += chunk.length - res.length;
  }
  return tally;
}

function fmt(label: string, t: Tally) {
  const parts = [`${t.inserted} new`, `${t.updated} changed`, `${t.unchanged} unchanged`];
  return `${label.padEnd(13)} ${parts.join(" · ")}`;
}

/** stale content rows, with how much progress would go with each */
type Stale = { table: string; slug: string; progress: number };

async function findStale(tx: Tx): Promise<Stale[]> {
  const liveModules = modules.map((m) => m.slug);
  const liveUnits = modules.flatMap((m) => m.units.map((u) => u.slug));
  const liveProblems = modules.flatMap((m) => (m.problems ?? []).map((p) => p.slug));
  const liveProjects = projects.map((p) => p.slug);
  const liveDeliverables = projects.flatMap((p) => p.deliverables.map((d) => d.slug));

  const q = (text: SQL) => tx.execute<{ slug: string; progress: number }>(text).then((r) => r.rows);
  const out: Stale[] = [];
  const add = (table: string, rows: { slug: string; progress: number }[]) =>
    out.push(...rows.map((r) => ({ table, slug: r.slug, progress: Number(r.progress) })));

  add("problems", await q(sql`
    select problems.slug, (select count(*) from problem_attempts a where a.problem_slug = problems.slug)::int as progress
    from problems where ${notInArray(s.problems.slug, liveProblems)}
  `));
  add("units", await q(sql`
    select units.slug,
      ((select count(*) from unit_progress x where x.unit_slug = units.slug)
       + (select count(*) from flashcards f where f.unit_slug = units.slug))::int as progress
    from units where ${notInArray(s.units.slug, liveUnits)}
  `));
  // a module's own progress; its stale units and problems are counted above,
  // and ones that moved to another module have already been re-parented
  add("modules", await q(sql`
    select modules.slug, (select count(*) from checkpoint_attempts c where c.module_slug = modules.slug)::int as progress
    from modules where ${notInArray(s.modules.slug, liveModules)}
  `));
  add("deliverables", await q(sql`
    select deliverables.slug, (select count(*) from deliverable_done x where x.deliverable_slug = deliverables.slug)::int as progress
    from deliverables where ${notInArray(s.deliverables.slug, liveDeliverables)}
  `));
  add("projects", await q(sql`
    select projects.slug, (select count(*) from user_projects x where x.project_slug = projects.slug)::int as progress
    from projects where ${notInArray(s.projects.slug, liveProjects)}
  `));
  return out;
}

async function prune(tx: Tx, stale: Stale[]) {
  const slugs = (t: string) => stale.filter((x) => x.table === t).map((x) => x.slug);
  const del = async (table: PgTable, col: PgColumn, list: string[]) => {
    if (list.length) await tx.delete(table).where(inArray(col, list));
  };
  // children before parents, so a cascade never reaches past what was listed
  await del(s.problems, s.problems.slug, slugs("problems"));
  await del(s.units, s.units.slug, slugs("units"));
  await del(s.modules, s.modules.slug, slugs("modules"));
  await del(s.deliverables, s.deliverables.slug, slugs("deliverables"));
  await del(s.projects, s.projects.slug, slugs("projects"));
}

async function seed(tx: Tx) {
  console.log(fmt("phases", await upsert(tx, s.phases, phases.map((p) => ({ ...p })), s.phases.slug)));
  console.log(fmt("tracks", await upsert(tx, s.tracks, tracks.map((t) => ({ ...t })), s.tracks.slug)));

  const moduleRows = modules.map((m) => ({
    slug: m.slug,
    trackSlug: m.trackSlug,
    phaseSlug: m.phaseSlug,
    order: m.order,
    title: m.title,
    summary: m.summary,
    prereqSlugs: m.prereqSlugs ?? [],
  }));
  console.log(fmt("modules", await upsert(tx, s.modules, moduleRows, s.modules.slug)));

  const unitRows = modules.flatMap((m) =>
    m.units.map((u, i) => ({
      slug: u.slug,
      moduleSlug: m.slug,
      order: i + 1,
      title: u.title,
      objective: u.objective,
      estMinutes: u.estMinutes,
      conceptMd: u.conceptMd ?? "",
      recall: u.recall ?? [],
      pitfalls: u.pitfalls ?? [],
      interviewAngle: u.interviewAngle ?? null,
    })),
  );
  console.log(fmt("units", await upsert(tx, s.units, unitRows, s.units.slug)));

  // resources are positional: upsert by (unit, order), then drop the tail
  const resourceRows = modules.flatMap((m) =>
    m.units.flatMap((u) =>
      u.resources.map((r, j) => ({
        unitSlug: u.slug,
        order: j + 1,
        title: r.title,
        url: r.url,
        kind: r.kind,
        minutes: r.minutes ?? null,
        whyThisOne: r.whyThisOne,
        isPrimary: r.isPrimary ?? false,
      })),
    ),
  );
  const resources = await upsert(tx, s.resources, resourceRows, [s.resources.unitSlug, s.resources.order]);
  const liveResourceKeys = resourceRows.map((r) => `${r.unitSlug}:${r.order}`);
  const dropped = await tx
    .delete(s.resources)
    .where(notInArray(sql`${s.resources.unitSlug} || ':' || ${s.resources.order}`, liveResourceKeys))
    .returning({ id: s.resources.id });
  console.log(`${fmt("resources", resources)} · ${dropped.length} removed`);

  const problemRows = modules.flatMap((m) =>
    (m.problems ?? []).map((p, i) => ({
      slug: p.slug,
      moduleSlug: m.slug,
      unitSlug: p.unitSlug ?? null,
      order: i + 1,
      title: p.title,
      platform: p.platform,
      url: p.url,
      difficulty: p.difficulty,
      patternTag: p.patternTag,
      triggerHint: p.triggerHint,
      approachHint: p.approachHint,
      estMinutes: p.estMinutes ?? 20,
      isMust: p.isMust ?? true,
    })),
  );
  console.log(fmt("problems", await upsert(tx, s.problems, problemRows, s.problems.slug)));

  const projectRows = projects.map((pr) => ({
    slug: pr.slug,
    name: pr.name,
    phaseSlug: pr.phaseSlug,
    order: pr.order,
    summary: pr.summary,
    resumeLine: pr.resumeLine,
    pledgeNoAi: pr.pledgeNoAi ?? true,
  }));
  console.log(fmt("projects", await upsert(tx, s.projects, projectRows, s.projects.slug)));

  const deliverableRows = projects.flatMap((pr) =>
    pr.deliverables.map((d, i) => ({
      slug: d.slug,
      projectSlug: pr.slug,
      order: i + 1,
      title: d.title,
      definitionOfDone: d.definitionOfDone,
      estMinutes: d.estMinutes,
    })),
  );
  console.log(fmt("deliverables", await upsert(tx, s.deliverables, deliverableRows, s.deliverables.slug)));

  const recallCount = unitRows.reduce((n, u) => n + u.recall.length, 0);
  console.log(`${"recall".padEnd(13)} ${recallCount} cards across ${unitRows.length} units`);

  const stale = await findStale(tx);
  if (!stale.length) {
    console.log("stale         none");
    return;
  }

  console.log(`\nstale — in the database, no longer in content/:`);
  for (const x of stale)
    console.log(`  ${x.table.padEnd(13)} ${x.slug}${x.progress ? `   (${x.progress} progress rows)` : ""}`);

  if (!PRUNE) {
    console.log("\nThese are still live — the planner can still offer them. Re-run with --prune to remove them.");
    return;
  }
  const carrying = stale.filter((x) => x.progress > 0);
  if (carrying.length && !FORCE) {
    throw new Error(
      `${carrying.length} stale rows still carry progress, which the cascade would delete. ` +
        `Rename the slug back, or re-run with --prune --force to accept the loss. Nothing was written.`,
    );
  }
  await prune(tx, stale);
  console.log(`\npruned ${stale.length} rows${carrying.length ? `, taking ${carrying.reduce((n, x) => n + x.progress, 0)} progress rows with them` : ""}`);
}

async function main() {
  const errors = validateContent();
  if (errors.length) {
    console.error("content validation failed:\n" + errors.map((e) => `  · ${e}`).join("\n"));
    process.exit(1);
  }
  if (DRY) console.log("dry run — every change below is rolled back\n");

  try {
    await db.transaction(async (tx) => {
      await seed(tx);
      if (DRY) throw new DryRun();
    });
    console.log("\nseed ok");
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
    console.log("\ndry run ok — rolled back, nothing written");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
