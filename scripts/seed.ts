import { eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { modules, phases, projects, tracks, validateContent } from "@/content";

/**
 * Idempotent: upserts by slug and prunes rows that content no longer defines.
 * Progress tables are never touched — re-seeding is always safe.
 */
async function main() {
  const errors = validateContent();
  if (errors.length) {
    console.error("content validation failed:\n" + errors.map((e) => `  · ${e}`).join("\n"));
    process.exit(1);
  }

  for (const p of phases) {
    await db.insert(s.phases).values(p).onConflictDoUpdate({ target: s.phases.slug, set: p });
  }
  console.log(`phases    ${phases.length}`);

  for (const t of tracks) {
    await db.insert(s.tracks).values(t).onConflictDoUpdate({ target: s.tracks.slug, set: t });
  }
  console.log(`tracks    ${tracks.length}`);

  let unitCount = 0;
  let resourceCount = 0;
  let problemCount = 0;

  for (const m of modules) {
    const row = {
      slug: m.slug,
      trackSlug: m.trackSlug,
      phaseSlug: m.phaseSlug,
      order: m.order,
      title: m.title,
      summary: m.summary,
      prereqSlugs: m.prereqSlugs ?? [],
    };
    await db.insert(s.modules).values(row).onConflictDoUpdate({ target: s.modules.slug, set: row });

    for (const [i, u] of m.units.entries()) {
      const unit = {
        slug: u.slug,
        moduleSlug: m.slug,
        order: i + 1,
        title: u.title,
        objective: u.objective,
        estMinutes: u.estMinutes,
        conceptMd: u.conceptMd ?? "",
      };
      await db.insert(s.units).values(unit).onConflictDoUpdate({ target: s.units.slug, set: unit });
      unitCount++;

      // resources are positional; replace the set rather than diffing it
      await db.delete(s.resources).where(eq(s.resources.unitSlug, u.slug));
      if (u.resources.length) {
        await db.insert(s.resources).values(
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
        );
        resourceCount += u.resources.length;
      }
    }

    for (const [i, p] of (m.problems ?? []).entries()) {
      const prob = {
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
      };
      await db.insert(s.problems).values(prob).onConflictDoUpdate({ target: s.problems.slug, set: prob });
      problemCount++;
    }
  }

  let deliverableCount = 0;
  for (const pr of projects) {
    const row = {
      slug: pr.slug,
      name: pr.name,
      phaseSlug: pr.phaseSlug,
      order: pr.order,
      summary: pr.summary,
      resumeLine: pr.resumeLine,
      pledgeNoAi: pr.pledgeNoAi ?? true,
    };
    await db.insert(s.projects).values(row).onConflictDoUpdate({ target: s.projects.slug, set: row });

    for (const [i, d] of pr.deliverables.entries()) {
      const del = {
        slug: d.slug,
        projectSlug: pr.slug,
        order: i + 1,
        title: d.title,
        definitionOfDone: d.definitionOfDone,
        estMinutes: d.estMinutes,
      };
      await db
        .insert(s.deliverables)
        .values(del)
        .onConflictDoUpdate({ target: s.deliverables.slug, set: del });
      deliverableCount++;
    }
  }

  // prune content that was removed from the registry
  const liveModules = modules.map((m) => m.slug);
  const liveUnits = modules.flatMap((m) => m.units.map((u) => u.slug));
  const liveProblems = modules.flatMap((m) => (m.problems ?? []).map((p) => p.slug));
  if (liveProblems.length) await db.delete(s.problems).where(notInArray(s.problems.slug, liveProblems));
  if (liveUnits.length) await db.delete(s.units).where(notInArray(s.units.slug, liveUnits));
  if (liveModules.length) await db.delete(s.modules).where(notInArray(s.modules.slug, liveModules));
  const liveDeliverables = projects.flatMap((pr) => pr.deliverables.map((d) => d.slug));
  const liveProjects = projects.map((pr) => pr.slug);
  if (liveDeliverables.length)
    await db.delete(s.deliverables).where(notInArray(s.deliverables.slug, liveDeliverables));
  if (liveProjects.length) await db.delete(s.projects).where(notInArray(s.projects.slug, liveProjects));

  console.log(`modules   ${modules.length}`);
  console.log(`units     ${unitCount}`);
  console.log(`resources ${resourceCount}`);
  console.log(`problems  ${problemCount}`);
  console.log(`projects  ${projects.length} (${deliverableCount} deliverables)`);
  console.log("seed ok");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
