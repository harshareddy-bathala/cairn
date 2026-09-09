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

export type Unit = {
  slug: string;
  title: string;
  objective: string;
  estMinutes: number;
  conceptMd?: string;
  /** max 3. A longer list is a reading list, and reading lists are procrastination. */
  resources: Resource[];
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
