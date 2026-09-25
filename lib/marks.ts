/**
 * The app's small visual vocabularies, each defined once.
 *
 * The same three things were re-derived page by page — the difficulty colours
 * in the problem row and on Review, the 70/50 score bands in four places, the
 * ✓ ◐ ▢ state glyphs in six — and a copy that drifted was a page that said
 * "medium" in a different colour, or a glyph with no words behind it for a
 * screen reader. `StateMark` (components/instrument/state-mark.tsx) renders
 * the glyphs with their text alternative attached.
 */

export const DIFFICULTY = {
  easy: { cls: "text-phos-dim", label: "easy", short: "easy" },
  medium: { cls: "text-warn", label: "medium", short: "med" },
  hard: { cls: "text-bad", label: "hard", short: "hard" },
} as const;
export type Difficulty = keyof typeof DIFFICULTY;

/** a percentage's band: 70 and over is holding, 50 to 69 is slipping, under 50 is a gap */
export type Band = "ok" | "warn" | "bad";
export function scoreBand(pct: number): Band {
  return pct >= 70 ? "ok" : pct >= 50 ? "warn" : "bad";
}
export const BAND_TEXT: Record<Band, string> = {
  ok: "text-phos",
  warn: "text-warn",
  bad: "text-bad",
};
export const scoreText = (pct: number) => BAND_TEXT[scoreBand(pct)];

/** done, started, not started — a checkpoint, a story, a module in placement */
export type MarkState = "done" | "partial" | "open";
export const MARK: Record<MarkState, { glyph: string; cls: string }> = {
  done: { glyph: "✓", cls: "text-phos" },
  partial: { glyph: "◐", cls: "text-warn" },
  open: { glyph: "▢", cls: "text-lo" },
};
