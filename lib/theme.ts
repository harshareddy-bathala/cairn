/**
 * Two themes and a "match the system" setting.
 *
 * Dark is the default and the identity — this is not a light-first app that
 * grew a dark mode. Daylight exists because the app is used on a phone, and a
 * phone gets used outside.
 */
export type ThemeChoice = "dark" | "light" | "system";

export const THEMES: { value: ThemeChoice; label: string; note: string }[] = [
  { value: "dark", label: "Instrument", note: "the default — a dark room" },
  { value: "light", label: "Daylight", note: "paper, for a bright screen outdoors" },
  { value: "system", label: "Match system", note: "follow the device setting" },
];

export const THEME_KEY = "cairn-theme";

/**
 * The inline script, run synchronously in <head> before the first paint.
 *
 * It has to be a string of plain ES5 in one statement: it executes while the
 * document is still parsing, long before any bundle exists, and any error in it
 * would be an uncaught exception on every page load. The try/catch is not
 * defensive habit — `localStorage` genuinely throws rather than returning null
 * when a browser is set to block site data, and an exception here would leave
 * the attribute unset on the exact users most likely to have a preference.
 *
 * `<html>` is stamped with the dark default server-side, so a reader with no
 * stored choice sees the correct theme with this script doing nothing at all.
 */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});var t=c==="system"||!c?(c==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):c;document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** Applies a choice immediately and remembers it. Called from the settings control. */
export function applyTheme(choice: ThemeChoice) {
  const resolved =
    choice === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : choice;
  document.documentElement.setAttribute("data-theme", resolved);
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // blocked site data: the theme still applies for this page, it just will
    // not survive a reload. Better than refusing to switch at all.
  }
}

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    // same as above
  }
  return "dark";
}
