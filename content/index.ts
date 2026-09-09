import type { Module } from "./types";
import { phases } from "./phases";
import { tracks } from "./tracks";
import { cppStl } from "./modules/dsa/01-cpp-stl";
import { linuxFoundations } from "./modules/devops/01-linux";

/**
 * The curriculum registry. Content is authored here in git and pushed into
 * Postgres by scripts/seed.ts — the database is a cache, this is the source.
 */
export const modules: Module[] = [cppStl, linuxFoundations];

export { phases, tracks };

/** fail the seed loudly rather than writing a broken curriculum */
export function validateContent() {
  const errors: string[] = [];
  const moduleSlugs = new Set<string>();
  const unitSlugs = new Set<string>();
  const problemSlugs = new Set<string>();
  const trackSlugs = new Set(tracks.map((t) => t.slug));
  const phaseSlugs = new Set(phases.map((p) => p.slug));

  for (const m of modules) {
    if (moduleSlugs.has(m.slug)) errors.push(`duplicate module slug: ${m.slug}`);
    moduleSlugs.add(m.slug);
    if (!trackSlugs.has(m.trackSlug)) errors.push(`${m.slug}: unknown track ${m.trackSlug}`);
    if (!phaseSlugs.has(m.phaseSlug)) errors.push(`${m.slug}: unknown phase ${m.phaseSlug}`);
    if (!m.units.length) errors.push(`${m.slug}: has no units`);

    for (const u of m.units) {
      if (unitSlugs.has(u.slug)) errors.push(`duplicate unit slug: ${u.slug}`);
      unitSlugs.add(u.slug);
      if (!u.resources.length) errors.push(`${u.slug}: no resources — every unit needs at least one`);
      if (u.resources.length > 3)
        errors.push(`${u.slug}: ${u.resources.length} resources — the cap is 3, on purpose`);
      if (u.resources.some((r) => !r.whyThisOne.trim()))
        errors.push(`${u.slug}: a resource is missing whyThisOne`);
      if (u.resources.filter((r) => r.isPrimary).length > 1)
        errors.push(`${u.slug}: more than one primary resource`);
    }

    for (const p of m.problems ?? []) {
      if (problemSlugs.has(p.slug)) errors.push(`duplicate problem slug: ${p.slug}`);
      problemSlugs.add(p.slug);
      if (p.unitSlug && !m.units.some((u) => u.slug === p.unitSlug))
        errors.push(`${p.slug}: unitSlug ${p.unitSlug} is not in module ${m.slug}`);
    }
  }

  for (const m of modules)
    for (const pre of m.prereqSlugs ?? [])
      if (!moduleSlugs.has(pre)) errors.push(`${m.slug}: unknown prereq ${pre}`);

  return errors;
}
