import type { Track } from "./types";

export const tracks: Track[] = [
  { slug: "dsa", name: "DSA", kind: "learn", glyph: "▦", order: 1 },
  { slug: "devops", name: "DevOps / SRE", kind: "learn", glyph: "◈", order: 2 },
  { slug: "sde", name: "SDE / Backend", kind: "learn", glyph: "▲", order: 3 },
  { slug: "corecs", name: "Core CS", kind: "learn", glyph: "◎", order: 4 },
  { slug: "aptitude", name: "Aptitude", kind: "drill", glyph: "▤", order: 5 },
  { slug: "project", name: "Projects", kind: "build", glyph: "✦", order: 6 },
  { slug: "career", name: "Career", kind: "hunt", glyph: "◰", order: 7 },
];
