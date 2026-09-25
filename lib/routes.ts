/**
 * Every in-app destination, named once.
 *
 * The same path used to be typed out in the nav, in the planner's block links
 * and in each action's `revalidatePath` — so moving a page meant finding every
 * copy, and the one that was missed failed silently: a stale revalidate simply
 * stops refreshing, it never errors. Paths live here and are imported.
 *
 * Old paths (/metrics, /projects, …) are not listed: they survive only as
 * redirects in `next.config.ts`, for links already saved in stored plans and
 * sent Telegram messages.
 */
export const ROUTES = {
  today: "/today",
  trail: "/roadmap",
  review: "/review",
  progress: "/progress",
  certification: "/progress/certification",
  cohort: "/progress/cohort",
  desk: "/desk",
  career: "/desk/career",
  aptitude: "/desk/aptitude",
  settings: "/settings",
  start: "/start",
} as const;

/** a section's own pages, as its sub-navigation lists them */
export type SubNavItem = { href: string; label: string };

export const PROGRESS_PAGES: SubNavItem[] = [
  { href: ROUTES.progress, label: "Overview" },
  { href: ROUTES.certification, label: "Certification" },
  { href: ROUTES.cohort, label: "Cohort" },
];

export const DESK_PAGES: SubNavItem[] = [
  { href: ROUTES.desk, label: "Projects" },
  { href: ROUTES.career, label: "Career" },
  { href: ROUTES.aptitude, label: "Aptitude" },
];

/**
 * Where each retired path now lives. `next.config.ts` turns these into 307s;
 * temporary rather than permanent, so a browser never caches a mapping that a
 * later change might want to revise.
 */
export const MOVED: [from: string, to: string][] = [
  ["/metrics", ROUTES.progress],
  ["/certification", ROUTES.certification],
  ["/cohort", ROUTES.cohort],
  ["/projects", ROUTES.desk],
  ["/career", ROUTES.career],
  // the Telegram aptitude reminder linked here before any page existed
  ["/aptitude", ROUTES.aptitude],
];
