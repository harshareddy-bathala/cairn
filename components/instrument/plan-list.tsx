"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ProblemList } from "./problem-list";
import { AptitudeLog } from "./aptitude-log";
import { MockLogForm } from "./career-desk";
import { tickBlock } from "@/app/actions/day";
import { useAction } from "@/lib/use-action";
import type { HydratedBlock } from "@/lib/planner";
import { cn } from "@/lib/cn";
import { fmtMin } from "@/lib/format";
import { DUR, EASE } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { APTITUDE_SOURCES } from "@/content/aptitude";

const GLYPH: Record<string, string> = {
  redo: "↺",
  recall: "◱",
  dsa: "▦",
  aptitude: "▤",
  devops: "◈",
  sde: "▲",
  corecs: "◎",
  project: "✦",
  cadence: "▧",
  career: "◰",
  close: "▣",
};

/**
 * The day, as a list of sized blocks.
 *
 * The point of this component is that it removes a decision. Open the app and
 * the work is already chosen, ordered and sized to the time you actually have —
 * "felt unstructured" was the failure, and deciding what to do at 5:15 AM is
 * where the old roadmap died.
 */
export function PlanList({
  blocks: initial,
  dayIndex,
  journeyWeek,
}: {
  blocks: HydratedBlock[];
  dayIndex: number;
  journeyWeek: number;
}) {
  const tick = useAction(tickBlock);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const blocks = initial.map((b) => (b.id in ticked ? { ...b, done: ticked[b.id]! } : b));

  // the first unfinished block is the one you are on — everything else is quiet
  const currentId = blocks.find((b) => !b.done && b.kind !== "close")?.id;
  const [openId, setOpenId] = useState<string | null>(currentId ?? null);

  return (
    <>
      {tick.error && (
        <p role="alert" className="note mb-2 text-bad">
          {tick.error}
        </p>
      )}
      <ul data-plan className="divide-y divide-line-soft">
        {blocks.map((b) => (
          <Block
            key={b.id}
            block={b}
            current={b.id === currentId}
            open={openId === b.id}
            onToggleOpen={() => setOpenId(openId === b.id ? null : b.id)}
            dayIndex={dayIndex}
            journeyWeek={journeyWeek}
            onTick={async (done) => {
              setTicked((t) => ({ ...t, [b.id]: done }));
              const res = await tick.run(b.id, done);
              if (!res.ok) {
                setTicked((t) => {
                  const next = { ...t };
                  delete next[b.id];
                  return next;
                });
              }
            }}
          />
        ))}
      </ul>
    </>
  );
}

function Block({
  block: b,
  current,
  open,
  onToggleOpen,
  onTick,
  dayIndex,
  journeyWeek,
}: {
  block: HydratedBlock;
  current: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onTick: (done: boolean) => void;
  dayIndex: number;
  journeyWeek: number;
}) {
  const reduce = useReducedMotion();
  const glyph = GLYPH[b.kind] ?? GLYPH[b.track ?? ""] ?? "·";
  // Each of these finishes itself when the work is logged (see blockDone), and
  // offers a manual tick for work done somewhere Cairn cannot see.
  const tickable = b.kind === "aptitude" || b.kind === "project" || b.kind === "cadence";
  const expandable = b.problems.length > 0 || tickable;
  // stored plans predate this, so the close row's anchor is decided here
  const href = b.kind === "close" ? "#close" : b.href;

  return (
    // a finished block is quieted by colour, not opacity — at 55% opacity its
    // detail line fell to 2.4:1, below what anyone can read on a phone outdoors
    <li className="relative">
      {current && !b.done && (
        <span className="absolute inset-y-0 -left-4 w-[2px] rounded-r-[1px] bg-phos" />
      )}

      <div className="flex items-baseline gap-3 py-2.5">
        <span
          className={cn(
            "tap w-4 shrink-0 text-center text-sm leading-none",
            b.done
              ? "text-phos"
              : b.kind === "redo" || b.kind === "cadence" || b.kind === "recall"
                ? "text-info"
                : "text-lo",
          )}
          aria-hidden
        >
          {b.done ? "✓" : glyph}
        </span>

        <span className="min-w-0 flex-1">
          {href && !b.done ? (
            href.startsWith("#") ? (
              <a
                href={href}
                className="tap line-clamp-2 text-sm text-hi transition-colors duration-[120ms] hover:text-phos sm:truncate"
              >
                {b.title}
              </a>
            ) : (
              <Link
                href={href}
                className="tap line-clamp-2 text-sm text-hi transition-colors duration-[120ms] hover:text-phos sm:truncate"
              >
                {b.title}
              </Link>
            )
          ) : (
            <span className={cn("line-clamp-2 text-sm sm:truncate", b.done ? "text-lo" : "text-hi")}>
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
            aria-label={`${open ? "Collapse" : "Expand"} ${b.title}`}
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="note text-lo">
                  25 questions, timed. Logging the score finishes this block.
                </p>
                {APTITUDE_SOURCES.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap inline-block py-1 text-xs text-info underline underline-offset-[3px]"
                  >
                    {s.title} ↗
                  </a>
                ))}
              </div>
              <AptitudeLog dayIndex={dayIndex} scores={[]} compact />
            </div>
          )}

          {b.kind === "cadence" && (
            <div className="space-y-2">
              <p className="note text-lo">Logging the session counts it against this week's quota.</p>
              <MockLogForm journeyWeek={journeyWeek} defaultKind={b.id.slice("cadence:".length)} />
            </div>
          )}

          {b.kind === "project" && (
            <p className="note text-lo">
              Mark the deliverable done on{" "}
              <Link href={ROUTES.desk} className="text-info underline underline-offset-[3px]">
                the project board
              </Link>{" "}
              with a link to the evidence, and this block finishes with it.
            </p>
          )}

          {tickable && (
            <div className="mt-3 flex items-center justify-end gap-3">
              {!b.done && <span className="text-2xs text-lo">did it somewhere Cairn can't see?</span>}
              <button
                type="button"
                onClick={() => onTick(!b.done)}
                className={cn(
                  "ctl rounded-[3px] border px-3 py-1 text-xs transition-colors duration-[120ms]",
                  b.done
                    ? "border-phos text-phos"
                    : "border-line text-mid hover:border-phos-dim hover:text-hi",
                )}
              >
                {b.done ? "✓ done" : "mark done"}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </li>
  );
}
