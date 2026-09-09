import type { Phase } from "./types";

/** Three phases. No dates — a phase is a place on the trail, not a month. */
export const phases: Phase[] = [
  {
    slug: "foundations",
    order: 1,
    title: "Foundations",
    mission:
      "Become genuinely dangerous at Linux, Docker and C++ fundamentals. Get aptitude off the floor. Ship sentinel. By the end you can hold a technical conversation without bluffing.",
    identity: "Someone building a base",
  },
  {
    slug: "depth",
    order: 2,
    title: "Depth & Automation",
    mission:
      "Automate everything: CI/CD, Terraform, observability, SRE principles. Trees and graphs. Ship atlas to real users, finalise resumes, open the off-campus lane.",
    identity: "Someone who runs systems",
  },
  {
    slug: "orchestration",
    order: 3,
    title: "Orchestration & Interview Mode",
    mission:
      "Kubernetes, dynamic programming, system design. Ship atlas-k8s, then freeze features and switch fully to mocks, applications and interviews.",
    identity: "A candidate performing",
  },
];
