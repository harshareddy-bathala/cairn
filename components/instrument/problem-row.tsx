"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

export type Outcome = "clean" | "hinted" | "editorial" | "failed";

export type ProblemRowData = {
  slug: string;
  title: string;
  url: string;
  platform: string;
  difficulty: "easy" | "medium" | "hard";
  patternTag: string;
  triggerHint: string;
  approachHint: string;
  estMinutes: number;
  isMust: boolean;
  outcome?: Outcome | null;
  hintRevealed?: boolean;
  redoDueDay?: number | null;
  /** set the instant an editorial is reported, before the server returns the day */
  redoPending?: boolean;
};

const DIFF = {
  easy: { cls: "text-phos-dim", label: "easy" },
  medium: { cls: "text-warn", label: "med" },
  hard: { cls: "text-bad", label: "hard" },
} as const;

const OUTCOME_MARK: Record<Outcome, { glyph: string; cls: string; label: string }> = {
  clean: { glyph: "✓", cls: "text-phos", label: "solved clean" },
  hinted: { glyph: "◐", cls: "text-warn", label: "solved with hints" },
  editorial: { glyph: "✕", cls: "text-bad", label: "opened editorial" },
  failed: { glyph: "✕", cls: "text-bad", label: "not solved" },
};

/**
 * A problem as a single instrument row. The trigger -> approach hint sits behind
 * a dither mask: revealing it is a deliberate act, and it is recorded, because
 * "editorial opened = not done" is the rule this whole app exists to enforce.
 */
export function ProblemRow({
  p,
  onOutcome,
  onRevealHint,
}: {
  p: ProblemRowData;
  onOutcome?: (slug: string, outcome: Outcome) => void;
  onRevealHint?: (slug: string) => void;
}) {
  const [revealed, setRevealed] = useState(Boolean(p.hintRevealed));
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const mark = p.outcome ? OUTCOME_MARK[p.outcome] : null;

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    onRevealHint?.(p.slug);
  }

  return (
    <li
      className={cn(
        "group relative border-l-2 pl-3 transition-colors duration-[120ms]",
        p.outcome === "clean" && "border-phos",
        p.outcome === "hinted" && "border-warn",
        (p.outcome === "editorial" || p.outcome === "failed") && "border-bad",
        !p.outcome && "border-ink-700 hover:border-lo",
      )}
    >
      <div className="flex items-baseline gap-2 py-2">
        <span className={cn("shrink-0 text-2xs", mark ? mark.cls : "text-lo")} aria-hidden>
          {mark ? mark.glyph : "▸"}
        </span>

        <a
          href={p.url}
          target="_blank"
          rel="noreferrer noopener"
          className="min-w-0 flex-1 truncate text-sm text-hi underline-offset-4 hover:underline"
        >
          {p.title}
        </a>

        <span className="legend shrink-0">{p.patternTag}</span>
        <span className={cn("w-9 shrink-0 text-2xs uppercase", DIFF[p.difficulty].cls)}>
          {DIFF[p.difficulty].label}
        </span>
        <span className="legend w-10 shrink-0 text-right tabular-nums">~{p.estMinutes}m</span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 rounded-[2px] px-1 text-2xs text-lo transition-colors duration-[120ms] hover:text-mid"
        >
          {open ? "−" : "+"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 pb-3 pr-2">
          <div>
            <p className="legend mb-1">trigger</p>
            <p className="text-2xs leading-relaxed text-mid">{p.triggerHint}</p>
          </div>

          <div>
            <p className="legend mb-1">approach</p>
            <div className="relative">
              <p
                className={cn(
                  "text-2xs leading-relaxed transition-colors",
                  revealed ? "text-mid" : "text-transparent select-none",
                )}
              >
                {p.approachHint}
              </p>

              {!revealed && (
                <motion.button
                  type="button"
                  onClick={reveal}
                  initial={false}
                  animate={{ clipPath: "inset(0 0 0 0)" }}
                  exit={{ clipPath: "inset(0 0 0 100%)" }}
                  transition={{ duration: reduce ? 0 : DUR.slow, ease: EASE }}
                  className="absolute inset-0 flex items-center rounded-[2px] border border-line-soft bg-ink-800/90 px-2 text-left text-2xs text-lo transition-colors duration-[120ms] hover:border-line hover:text-mid"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent 0 3px, oklch(1 0 0 / 0.03) 3px 4px)",
                  }}
                >
                  reveal approach — recorded
                </motion.button>
              )}
            </div>
          </div>

          {onOutcome && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="legend mr-1">on return</span>
              {(["clean", "hinted", "editorial"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => onOutcome(p.slug, o)}
                  className={cn(
                    "rounded-[2px] border px-2 py-1 text-2xs transition-colors duration-[120ms]",
                    p.outcome === o
                      ? o === "clean"
                        ? "border-phos text-phos"
                        : o === "hinted"
                          ? "border-warn text-warn"
                          : "border-bad text-bad"
                      : "border-line-soft text-lo hover:border-line hover:text-mid",
                  )}
                >
                  {OUTCOME_MARK[o].label}
                </button>
              ))}
            </div>
          )}

          {(p.redoDueDay != null || p.redoPending) && (
            <p className="text-2xs text-info">
              redo scheduled
              {p.redoDueDay != null ? ` — day ${String(p.redoDueDay).padStart(3, "0")}` : "…"}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
