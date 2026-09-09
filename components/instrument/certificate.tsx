"use client";

import { motion, useReducedMotion } from "motion/react";
import { Readout } from "./readout";
import { DUR, EASE } from "@/lib/motion";

/**
 * Moment 9 — the only ceremony in the app, and the only thing allowed to take
 * 900ms. Everything else is an instrument; this is the one page that is a
 * document.
 */
export function CertificateSeal({
  id,
  name,
  handle,
  phaseTitle,
  identity,
  issuedOn,
  snapshot,
}: {
  id: string;
  name: string;
  handle: string | null;
  phaseTitle: string;
  identity: string;
  issuedOn: string;
  snapshot: {
    examScore: number;
    examTotal: number;
    dayIndex: number;
    unitsDone: number;
    unitsTotal: number;
    checkpointsPassed: number;
    problemsSolved: number;
    activeDays: number;
  };
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, ease: EASE }}
      className="relative rounded-[--radius-panel] border border-line bg-ink-850/60 p-8
                 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-line-hi"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="legend">certificate of completion</p>
          <h1 className="mt-2 text-3xl leading-tight text-hi">{phaseTitle}</h1>
          {identity && <p className="mt-1 text-sm text-lo">{identity}</p>}
        </div>
        {/* the seal stamps in — the whole reason this page has a ceremony */}
        <motion.div
          initial={reduce ? false : { scale: 1.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: DUR.ceremony, ease: EASE, delay: 0.15 }}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-[3px] rounded-full border border-phos-dim/60"
          aria-hidden
        >
          <span className="h-[3px] w-3 rounded-[1px] bg-phos" />
          <span className="h-[3px] w-5 rounded-[1px] bg-phos-dim" />
          <span className="h-[3px] w-7 rounded-[1px] bg-phos-dim" />
        </motion.div>
      </div>

      <p className="prose-cairn mt-6 text-base leading-relaxed text-mid">
        <span className="text-hi">{name}</span> completed {snapshot.unitsDone} of{" "}
        {snapshot.unitsTotal} units and passed {snapshot.checkpointsPassed} module
        checkpoints, then scored {snapshot.examScore}/{snapshot.examTotal} on the phase
        exam and defended it out loud.
      </p>

      <div className="mt-6 grid gap-2 border-t border-line-soft pt-4 sm:grid-cols-2">
        <Readout label="units" value={`${snapshot.unitsDone}/${snapshot.unitsTotal}`} tone="ok" />
        <Readout label="checkpoints" value={snapshot.checkpointsPassed} tone="ok" />
        <Readout label="problems solved" value={snapshot.problemsSolved} tone="neutral" />
        <Readout label="active days" value={snapshot.activeDays} tone="neutral" />
        <Readout
          label="exam"
          value={`${snapshot.examScore}/${snapshot.examTotal}`}
          tone="ok"
        />
        <Readout label="issued on day" value={String(snapshot.dayIndex).padStart(3, "0")} tone="neutral" />
      </div>

      <footer className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t border-line-soft pt-4">
        <span className="legend">
          cairn · {issuedOn}
          {handle && (
            <>
              {" · "}
              <a href={`/u/${handle}`} className="text-info underline underline-offset-[3px]">
                /u/{handle}
              </a>
            </>
          )}
        </span>
        <span className="legend break-all text-lo/70">{id}</span>
      </footer>
    </motion.article>
  );
}
