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
import { storyBank } from "./modules/career/01-story-bank";
import { offCampus } from "./modules/career/02-offcampus";
import { projects } from "./projects";
import { questions, questionsForModule } from "./checkpoints";

/**
 * The curriculum registry. Content is authored here in git and pushed into
 * Postgres by scripts/seed.ts — the database is a cache, this is the source.
 */
export const modules: Module[] = [
  /* ---------------- phase 1 · foundations ---------------- */
  // dsa
  cppStl, arraysSorting, binarySearch, strings, recursionBacktracking, bitManipulation, linkedLists,
  // devops / sre
  linuxFoundations, git, networking, docker,
  // sde / backend
  cppInternals, oop, restFastapi,
  // core cs
  os, dbms, cn,

  /* ---------------- phase 2 · depth ---------------- */
  // career
  storyBank, offCampus,
];

export { phases, tracks, projects, questions };

/**
 * Modules whose checkpoints were authored before the answer-balance rule.
 *
 * Their answers sit almost entirely in position b. Rewriting them to spread
 * the key would change what every stored attempt's canonical index means, and
 * the sitting already shuffles options per question (lib/quiz-paper.ts), so
 * the browser never sees the authored order anyway. New modules get no such
 * pass: a bank whose key is one letter is a bank written on autopilot.
 */
export const LEGACY_ANSWER_ORDER = new Set([
  "dsa-cpp-stl", "dsa-arrays-sorting", "dsa-binary-search", "dsa-strings",
  "dsa-recursion-backtracking", "dsa-bit-manipulation", "dsa-linked-lists",
  "devops-linux-foundations", "devops-git", "devops-networking", "devops-docker",
  "sde-cpp-internals", "sde-oop", "sde-rest-fastapi",
  "corecs-os", "corecs-dbms", "corecs-cn",
]);

/** a problem link has to live where its platform says it does */
const PLATFORM_HOSTS: Record<string, RegExp> = {
  leetcode: /^(www\.)?leetcode\.com$/,
  gfg: /^(www\.)?geeksforgeeks\.org$/,
  codestudio: /^(www\.)?naukri\.com$/,
  hackerrank: /^(www\.)?hackerrank\.com$/,
};

/** options that only mean something in a fixed order, which the shuffle breaks */
const POSITIONAL = /\b(all|none|both|neither) of the (above|below)\b|\b(options?|answers?) \(?[a-d]\)?\b|\bboth [a-d] and [a-d]\b/i;

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
  const phaseOrder = new Map(phases.map((p) => [p.slug, p.order]));
  /** track:phase:order -> module, so two modules cannot claim one place on the trail */
  const places = new Map<string, string>();

  for (const m of modules) {
    if (moduleSlugs.has(m.slug)) errors.push(`duplicate module slug: ${m.slug}`);
    moduleSlugs.add(m.slug);
    if (!trackSlugs.has(m.trackSlug)) errors.push(`${m.slug}: unknown track ${m.trackSlug}`);
    if (!phaseSlugs.has(m.phaseSlug)) errors.push(`${m.slug}: unknown phase ${m.phaseSlug}`);
    if (!m.units.length) errors.push(`${m.slug}: has no units`);
    const place = `${m.trackSlug}:${m.phaseSlug}:${m.order}`;
    if (places.has(place)) errors.push(`${m.slug}: same track, phase and order as ${places.get(place)}`);
    else places.set(place, m.slug);

    for (const u of m.units) {
      if (unitSlugs.has(u.slug)) errors.push(`duplicate unit slug: ${u.slug}`);
      unitSlugs.add(u.slug);
      if (!(u.estMinutes >= 1 && u.estMinutes <= 180))
        errors.push(`${u.slug}: estMinutes ${u.estMinutes} — a unit is 1 to 180 minutes; split a longer one`);
      if (!u.resources.length) errors.push(`${u.slug}: no resources — every unit needs at least one`);
      if (u.resources.length > 3)
        errors.push(`${u.slug}: ${u.resources.length} resources — the cap is 3, on purpose`);
      if (u.resources.some((r) => !r.whyThisOne.trim()))
        errors.push(`${u.slug}: a resource is missing whyThisOne`);
      // exactly one: the unit page leads with it, and "which do I open first" is the question
      const primaries = u.resources.filter((r) => r.isPrimary).length;
      if (primaries !== 1) errors.push(`${u.slug}: ${primaries} primary resources — mark exactly one`);
      const urls = u.resources.map((r) => r.url);
      if (new Set(urls).size !== urls.length) errors.push(`${u.slug}: the same link listed twice`);

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
      if (p.estMinutes != null && !(p.estMinutes >= 1 && p.estMinutes <= 180))
        errors.push(`${p.slug}: estMinutes ${p.estMinutes} is outside 1 to 180`);
      const host = PLATFORM_HOSTS[p.platform];
      let url: URL | null = null;
      try {
        url = new URL(p.url);
      } catch {
        errors.push(`${p.slug}: url is not a url`);
      }
      if (url && url.protocol !== "https:") errors.push(`${p.slug}: url is not https`);
      if (url && host && !host.test(url.hostname))
        errors.push(`${p.slug}: platform ${p.platform} but the link goes to ${url.hostname}`);
    }
  }

  const bySlug = new Map(modules.map((m) => [m.slug, m]));
  for (const m of modules)
    for (const pre of m.prereqSlugs ?? []) {
      const p = bySlug.get(pre);
      if (!p) errors.push(`${m.slug}: unknown prereq ${pre}`);
      // the planner walks phases in order, so a prereq from a later phase can never be met first
      else if ((phaseOrder.get(p.phaseSlug) ?? 0) > (phaseOrder.get(m.phaseSlug) ?? 0))
        errors.push(`${m.slug}: prereq ${pre} is in a later phase (${p.phaseSlug})`);
    }
  // and no cycles: a module that transitively requires itself is never startable
  const state = new Map<string, "visiting" | "done">();
  const visit = (slug: string, path: string[]): void => {
    if (state.get(slug) === "done") return;
    if (state.get(slug) === "visiting") {
      errors.push(`prereq cycle: ${[...path.slice(path.indexOf(slug)), slug].join(" -> ")}`);
      return;
    }
    state.set(slug, "visiting");
    for (const pre of bySlug.get(slug)?.prereqSlugs ?? []) if (bySlug.has(pre)) visit(pre, [...path, slug]);
    state.set(slug, "done");
  };
  for (const m of modules) visit(m.slug, []);

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
    // options are shuffled per sitting, so "all of the above" might be read first
    for (const o of q.options)
      if (POSITIONAL.test(o)) errors.push(`${q.id}: option depends on its position: "${o}"`);
  }
  for (const m of modules) {
    const bank = questionsForModule(m.slug);
    const n = bank.length;
    if (n < 5) errors.push(`${m.slug}: ${n} checkpoint questions — the floor is 5`);
    if (LEGACY_ANSWER_ORDER.has(m.slug) || n === 0) continue;
    // Answer balance. The shuffle hides authored order from the browser, but a
    // bank keyed to one letter is a sign the distractors were written as an
    // afterthought — and it is what made "always b" pass sixteen checkpoints.
    const counts = [0, 0, 0, 0];
    for (const q of bank) counts[q.answer]!++;
    const cap = Math.ceil(n / 4) + 1;
    const worst = Math.max(...counts);
    if (worst > cap)
      errors.push(`${m.slug}: ${worst} of ${n} answers in one position (a-d: ${counts.join("/")}) — the cap is ${cap}`);
    if (counts.filter((c) => c > 0).length < Math.min(3, n))
      errors.push(`${m.slug}: answers use only ${counts.filter((c) => c > 0).length} positions — spread them over at least 3`);
  }
  for (const slug of LEGACY_ANSWER_ORDER)
    if (!moduleSlugs.has(slug)) errors.push(`LEGACY_ANSWER_ORDER names ${slug}, which is not a module`);

  return errors;
}
