/** minutes as "4h 05m" / "45m" — mono and tabular everywhere it lands */
export function fmtMin(n: number) {
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
