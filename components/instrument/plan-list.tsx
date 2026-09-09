"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ProblemList } from "./problem-list";
import { tickBlock } from "@/app/actions/day";
import type { HydratedBlock } from "@/lib/planner";
import { cn } from "@/lib/cn";
import { fmtMin } from "@/lib/format";
import { DUR, EASE } from "@/lib/motion";

const GLYPH: Record<string, string> = {
  redo: "↺",
  dsa: "▦",
  aptitude: "▤",
  devops: "◈",
  sde: "▲",
  corecs: "◎",
  project: "✦",
  cadence: "▧",
  close: "▣",
};

const APTITUDE_SOURCES = [
  { title: "IndiaBix", url: "https://www.indiabix.com/aptitude/questions-and-answers/" },
  { title: "PrepInsta", url: "https://prepinsta.com/aptitude/" },
];

/**
 * The day, as a list of sized blocks.
 *
 * The point of this component is that it removes a decision. Open the app and
 * the work is already chosen, ordered and sized to the time you actually have —
 * "felt unstructured" was the failure, and deciding what to do at 5:15 AM is
 * where the old roadmap died.
 */
export function PlanList({ blocks: initial }: { blocks: HydratedBlock[] }) {
  const [, startTransition] = useTransition();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const merged = initial.map((b) => (b.id in ticked ? { ...b, done: ticked[b.id] } : b));
  const [blocks, patch] = useOptimistic(merged, (state, p: { id: string; done: boolean }) =>
    state.map((b) => (b.id === p.id ? { ...b, done: p.done } : b)),
  );

  // the first unfinished block is the one you are on — everything else is quiet
  const currentId = blocks.find((b) => !b.done && b.kind !== "close")?.id;
  const [openId, setOpenId] = useState<string | null>(currentId ?? null);

  return (
    <ul data-plan className="divide-y divide-line-soft">
      {blocks.map((b) => (
        <Block
          key={b.id}
          block={b}
          current={b.id === currentId}
          open={openId === b.id}
          onToggleOpen={() => setOpenId(openId === b.id ? null : b.id)}
          onTick={(done) =>
            startTransition(async () => {
              patch({ id: b.id, done });
              await tickBlock(b.id, done);
              setTicked((t) => ({ ...t, [b.id]: done }));
            })
          }
        />
      ))}
    </ul>
  );
}

function Block({
  block: b,
  current,
  open,
  onToggleOpen,
  onTick,
}: {
  block: HydratedBlock;
  current: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onTick: (done: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const glyph = GLYPH[b.kind] ?? GLYPH[b.track ?? ""] ?? "·";
  const expandable = b.problems.length > 0 || b.kind === "aptitude";
  // only the aptitude drill has no completion signal of its own
  const tickable = b.kind === "aptitude";

  return (
    <li className={cn("relative", b.done && "opacity-55")}>
      {current && !b.done && (
        <span className="absolute inset-y-0 -left-4 w-[2px] rounded-r-[1px] bg-phos" />
      )}

      <div className="flex items-baseline gap-3 py-2.5">
        <span
          className={cn(
            "tap w-4 shrink-0 text-center text-sm leading-none",
            b.done
              ? "text-phos"
              : b.kind === "redo" || b.kind === "cadence"
                ? "text-info"
                : "text-lo",
          )}
          aria-hidden
        >
          {b.done ? "✓" : glyph}
        </span>

        <span className="min-w-0 flex-1">
          {b.href && !b.done ? (
            <Link
              href={b.href}
              className="tap block truncate text-sm text-hi transition-colors duration-[120ms] hover:text-phos"
            >
              {b.title}
            </Link>
          ) : (
            <span className={cn("block truncate text-sm", b.done ? "text-mid" : "text-hi")}>
              {b.title}
            </span>
          )}
          {b.detail && <span className="block truncate text-2xs text-lo">{b.detail}</span>}
        </span>

        {b.stretch && (
          <span className="legend shrink-0 text-phos-dim" title="pulled in by catch-up">
            +
          </span>
        )}

        <span className="legend shrink-0 tabular-nums">~{fmtMin(b.minutes)}</span>

        {expandable && (
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={open}
            aria-label={open ? "collapse" : "expand"}
            className="tap w-4 shrink-0 text-center text-2xs text-lo transition-colors duration-[120ms] hover:text-mid"
          >
            {/* chevrons, not +/−: the plus is already spoken for by the
                catch-up marker two columns to the left */}
            {open ? "▾" : "▸"}
          </button>
        )}
        {!expandable && <span className="w-4 shrink-0" />}
      </div>

      {open && expandable && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.base, ease: EASE }}
          className="pb-3 pl-7"
        >
          {b.problems.length > 0 && <ProblemList problems={b.problems} />}

          {b.kind === "aptitude" && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xs text-lo">
                25 questions, timed. Log the score, not the excuses.
              </p>
              {APTITUDE_SOURCES.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-2xs text-info underline underline-offset-[3px]"
                >
                  {s.title} ↗
                </a>
              ))}
              {tickable && (
                <button
                  type="button"
                  onClick={() => onTick(!b.done)}
                  className={cn(
                    "ml-auto rounded-[3px] border px-2.5 py-1 text-2xs transition-colors duration-[120ms]",
                    b.done
                      ? "border-phos text-phos"
                      : "border-line text-mid hover:border-phos-dim hover:text-hi",
                  )}
                >
                  {b.done ? "✓ done" : "mark done"}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </li>
  );
}
