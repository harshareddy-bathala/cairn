import { ROUTES } from "./routes";

/**
 * The five destinations, in one place.
 *
 * There were nine, and nine unlabelled glyphs is a memory test. Pages that are
 * visited weekly rather than daily now sit one level down, behind a section's
 * sub-navigation: Progress holds metrics, certification and the cohort; Desk
 * holds projects, the career lane and aptitude. Settings is not a destination
 * at all — it lives with the account, where people look for it.
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
   * four are the ones a day actually passes through; Desk sits behind "more"
   * with Settings.
   */
  primary?: boolean;
};

export const NAV: NavItem[] = [
  { href: ROUTES.today, glyph: "▣", label: "Today", primary: true },
  { href: ROUTES.trail, glyph: "◇", label: "Trail", primary: true },
  { href: ROUTES.review, glyph: "▤", label: "Review", primary: true },
  { href: ROUTES.progress, glyph: "◎", label: "Progress", primary: true },
  { href: ROUTES.desk, glyph: "✦", label: "Desk" },
];

/** reached from the account menu and the phone's "more" sheet, not the nav */
export const SETTINGS: NavItem = { href: ROUTES.settings, glyph: "⌗", label: "Settings" };

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
  ["/unit/", ROUTES.trail],
  ["/module/", ROUTES.trail],
  ["/checkpoint/", ROUTES.progress],
  ["/exam/", ROUTES.progress],
  [ROUTES.start, ROUTES.today],
];

export function activeHref(pathname: string) {
  const own = [...NAV, SETTINGS].find((n) => isActive(pathname, n.href));
  if (own) return own.href;
  const adopted = ADOPTED.find(([prefix]) => pathname.startsWith(prefix));
  return adopted?.[1] ?? null;
}
