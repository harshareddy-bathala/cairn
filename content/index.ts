import type { Module } from "./types";
import { phases } from "./phases";
import { tracks } from "./tracks";
import { cppStl } from "./modules/dsa/01-cpp-stl";
import { arraysSorting } from "./modules/dsa/02-arrays";
import { binarySearch } from "./modules/dsa/03-binary-search";
import { strings } from "./modules/dsa/04-strings";
import { recursionBacktracking } from "./modules/dsa/05-recursion";
import { bitManipulation } from "./modules/dsa/06-bits";
import { linkedLists } from "./modules/dsa/07-linked-lists";
import { linuxFoundations } from "./modules/devops/01-linux";
import { git } from "./modules/devops/02-git";
import { networking } from "./modules/devops/03-networking";
import { docker } from "./modules/devops/04-docker";
import { cppInternals } from "./modules/sde/01-cpp-internals";
import { oop } from "./modules/sde/02-oop";
import { restFastapi } from "./modules/sde/03-rest-fastapi";
import { os } from "./modules/corecs/01-os";
import { dbms } from "./modules/corecs/02-dbms";
import { cn } from "./modules/corecs/03-cn";
import { projects } from "./projects";
import { questions, questionsForModule } from "./checkpoints";

/**
 * The curriculum registry. Content is authored here in git and pushed into
 * Postgres by scripts/seed.ts — the database is a cache, this is the source.
 */
export const modules: Module[] = [
  // dsa
  cppStl, arraysSorting, binarySearch, strings, recursionBacktracking, bitManipulation, linkedLists,
  // devops / sre
  linuxFoundations, git, networking, docker,
  // sde / backend
  cppInternals, oop, restFastapi,
  // core cs
  os, dbms, cn,
];

export { phases, tracks, projects, questions };

/** fail the seed loudly rather than writing a broken curriculum */
export function validateContent() {
  const errors: string[] = [];
  const moduleSlugs = new Set<string>();
  const unitSlugs = new Set<string>();
  const problemSlugs = new Set<string>();
  /** every recall front in the curriculum -> the unit that owns it */
  const recallFronts = new Map<string, string>();
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

      // Retrieval practice is not optional decoration — it is the only part of
      // a unit that survives to November. A unit that cannot be asked about is
      // a unit that was only read.
      const recall = u.recall ?? [];
      if (recall.length < 2)
        errors.push(`${u.slug}: ${recall.length} recall cards — write at least 2`);
      if (recall.length > 4)
        errors.push(`${u.slug}: ${recall.length} recall cards — the cap is 4, or the deck stops being reviewable`);
      for (const c of recall) {
        if (!c.front.trim() || !c.back.trim())
          errors.push(`${u.slug}: a recall card has an empty side`);
        // a prompt you can answer by reading it is a statement, not a question
        if (c.front.trim().length < 12)
          errors.push(`${u.slug}: recall front is too short to be a real question: "${c.front}"`);
      }
      // fronts are the deck's identity — a collision would merge two cards into one
      const fronts = recall.map((c) => c.front.trim());
      if (new Set(fronts).size !== fronts.length)
        errors.push(`${u.slug}: two recall cards share a front`);
      for (const f of fronts) {
        if (recallFronts.has(f)) errors.push(`${u.slug}: recall front duplicated from ${recallFronts.get(f)}: "${f}"`);
        else recallFronts.set(f, u.slug);
      }

      if ((u.pitfalls ?? []).some((x) => !x.trim()))
        errors.push(`${u.slug}: an empty pitfall`);
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

  // projects
  const projectSlugs = new Set<string>();
  const deliverableSlugs = new Set<string>();
  for (const pr of projects) {
    if (projectSlugs.has(pr.slug)) errors.push(`duplicate project slug: ${pr.slug}`);
    projectSlugs.add(pr.slug);
    if (!phaseSlugs.has(pr.phaseSlug)) errors.push(`${pr.slug}: unknown phase ${pr.phaseSlug}`);
    if (!pr.deliverables.length) errors.push(`${pr.slug}: has no deliverables`);
    if (!pr.resumeLine.trim())
      errors.push(`${pr.slug}: no resumeLine — write the line before you build the thing`);
    for (const d of pr.deliverables) {
      if (deliverableSlugs.has(d.slug)) errors.push(`duplicate deliverable slug: ${d.slug}`);
      deliverableSlugs.add(d.slug);
      // a deliverable without a definition of done is a to-do, and to-dos rot
      if (!d.definitionOfDone.trim()) errors.push(`${d.slug}: no definitionOfDone`);
    }
  }

  // checkpoints
  const questionIds = new Set<string>();
  for (const q of questions) {
    if (questionIds.has(q.id)) errors.push(`duplicate question id: ${q.id}`);
    questionIds.add(q.id);
    if (!moduleSlugs.has(q.moduleSlug)) errors.push(`${q.id}: unknown module ${q.moduleSlug}`);
    if (q.options.length !== 4) errors.push(`${q.id}: ${q.options.length} options — the shape is 4`);
    if (q.answer < 0 || q.answer > 3) errors.push(`${q.id}: answer index out of range`);
    if (new Set(q.options).size !== q.options.length)
      errors.push(`${q.id}: duplicate options — one of them cannot be wrong`);
    // the explanation is the point of a checkpoint; a question without one only tests recall
    if (!q.why.trim()) errors.push(`${q.id}: no explanation`);
  }
  for (const m of modules) {
    const n = questionsForModule(m.slug).length;
    if (n < 5) errors.push(`${m.slug}: ${n} checkpoint questions — the floor is 5`);
  }

  return errors;
}
