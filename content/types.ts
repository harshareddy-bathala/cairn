import type { Difficulty, Platform, ResourceKind, TrackKind } from "@/db/schema";

export type Phase = {
  slug: string;
  order: number;
  title: string;
  mission: string;
  identity: string;
};

export type Track = {
  slug: string;
  name: string;
  kind: TrackKind;
  /** single mono glyph used in the rail — no emoji anywhere in this app */
  glyph: string;
  order: number;
};

export type Resource = {
  title: string;
  url: string;
  kind: ResourceKind;
  minutes?: number;
  /** the sentence that earns this link its place. Required — no bare link dumps. */
  whyThisOne: string;
  isPrimary?: boolean;
};

/**
 * One retrieval prompt. The unit of *remembering*, as opposed to the unit of
 * reading.
 *
 * Re-reading a concept feels like learning and mostly is not; being asked the
 * question cold, three active days later, is. These are authored alongside the
 * concept — by the person who just explained it — because a card written later
 * tests the summary rather than the idea.
 *
 * The rule for a good `front`: it must be answerable in one or two sentences
 * and it must have a *wrong* answer that a half-learner would actually give.
 * "What is a deadlock?" fails both. "Which of the four Coffman conditions is
 * the one real systems actually break?" passes.
 */
export type Recall = {
  front: string;
  back: string;
};

export type Unit = {
  slug: string;
  title: string;
  objective: string;
  estMinutes: number;
  conceptMd?: string;
  /** max 3. A longer list is a reading list, and reading lists are procrastination. */
  resources: Resource[];
  /**
   * 2-4 retrieval prompts. Seeded into the spaced-repetition deck the day the
   * unit is completed — see lib/recall.ts. Fewer than two and the unit teaches
   * nothing worth keeping; more than four and the deck stops being reviewable.
   */
  recall?: Recall[];
  /**
   * The mistakes that actually get made here, in the order they get made.
   *
   * Not a list of everything that can go wrong — a list of what goes wrong for
   * someone who has just read this unit and believes they understood it.
   */
  pitfalls?: string[];
  /** how this unit shows up in an interview, in one or two sentences */
  interviewAngle?: string;
};

export type Problem = {
  slug: string;
  title: string;
  platform: Platform;
  url: string;
  difficulty: Difficulty;
  patternTag: string;
  /** what in the statement should make you reach for this pattern */
  triggerHint: string;
  /** the approach in one or two lines — revealed only on request, and recorded */
  approachHint: string;
  estMinutes?: number;
  isMust?: boolean;
  /** optional: bind the problem to a specific unit rather than the whole module */
  unitSlug?: string;
};

export type Module = {
  slug: string;
  trackSlug: string;
  phaseSlug: string;
  order: number;
  title: string;
  summary: string;
  prereqSlugs?: string[];
  units: Unit[];
  problems?: Problem[];
};

export type Deliverable = {
  slug: string;
  title: string;
  /** written so that "I worked on it" cannot be mistaken for "it is finished" */
  definitionOfDone: string;
  estMinutes: number;
};

export type Project = {
  slug: string;
  name: string;
  phaseSlug: string;
  order: number;
  summary: string;
  /** the one line this project earns on the resume, written before it is built */
  resumeLine: string;
  /** hand-typed, zero AI codegen — the rule that makes the project count */
  pledgeNoAi?: boolean;
  deliverables: Deliverable[];
};
