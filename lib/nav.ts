/**
 * The nine destinations, in one place.
 *
 * Two navigations render from this list — the desktop rail and the mobile tab
 * bar — and they must never disagree about what exists. The rail linking to a
 * route with no page is exactly how /review shipped as a 404.
 */
export type NavItem = {
  href: string;
  /** a single mono glyph. No emoji anywhere in this app. */
  glyph: string;
  label: string;
  /**
   * Shown directly in the mobile tab bar rather than behind "more".
   *
   * Four, because a fifth tab plus "more" leaves each one under 65px on a
   * 390px screen — below the width where a label is readable at 11px. These
   * four are the ones a day actually passes through.
   */
  primary?: boolean;
};

export const NAV: NavItem[] = [
  { href: "/today", glyph: "▣", label: "Today", primary: true },
  { href: "/roadmap", glyph: "◇", label: "Trail", primary: true },
  { href: "/review", glyph: "▤", label: "Review", primary: true },
  { href: "/metrics", glyph: "◎", label: "Metrics", primary: true },
  { href: "/projects", glyph: "✦", label: "Projects" },
  { href: "/career", glyph: "▧", label: "Career" },
  { href: "/certification", glyph: "◈", label: "Certification" },
  { href: "/cohort", glyph: "◰", label: "Cohort" },
  { href: "/settings", glyph: "⌗", label: "Settings" },
];

export const PRIMARY_NAV = NAV.filter((n) => n.primary);
export const SECONDARY_NAV = NAV.filter((n) => !n.primary);

/** a nav item is current for its own route and anything beneath it */
export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Routes that have no nav entry of their own but belong under one.
 *
 * A unit page is reached from the trail, so the trail tab should stay lit
 * while you are reading one — otherwise the whole navigation goes dark the
 * moment you actually start working, which reads as being lost.
 */
const ADOPTED: [prefix: string, href: string][] = [
  ["/unit/", "/roadmap"],
  ["/module/", "/roadmap"],
  ["/checkpoint/", "/certification"],
  ["/exam/", "/certification"],
  ["/start", "/today"],
];

export function activeHref(pathname: string) {
  const own = NAV.find((n) => isActive(pathname, n.href));
  if (own) return own.href;
  const adopted = ADOPTED.find(([prefix]) => pathname.startsWith(prefix));
  return adopted?.[1] ?? null;
}
