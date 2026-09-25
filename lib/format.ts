/** minutes as "4h 05m" / "45m" — mono and tabular everywhere it lands */
export function fmtMin(n: number) {
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/**
 * An active day: "day 015", or "d015" where a column is tight.
 *
 * Every day number in the app goes through here, so they read the same
 * everywhere — the rail, Today, the close, the redo note, the logs.
 */
export function fmtDay(n: number, short = false) {
  const d = String(n).padStart(3, "0");
  return short ? `d${d}` : `day ${d}`;
}

/** a journey week: "week 02", or "w02" in a tight column */
export function fmtWeek(n: number, short = false) {
  const w = String(n).padStart(2, "0");
  return short ? `w${w}` : `week ${w}`;
}
