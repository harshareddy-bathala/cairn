"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ProblemRow, type Outcome, type ProblemRowData } from "./problem-row";
import { recordOutcome, revealHint } from "@/app/actions/progress";

type Patch = Partial<Pick<ProblemRowData, "outcome" | "hintRevealed" | "redoDueDay" | "redoPending">>;

/**
 * Owns the state for a set of problem rows.
 *
 * Three layers, because a self-report must never feel like it is waiting on a
 * network: optimistic state paints instantly, resolved state holds the server's
 * answer once it lands (surviving the end of the transition, which is what
 * otherwise causes a flash), and the server props are the base underneath both.
 */
export function ProblemList({ problems }: { problems: ProblemRowData[] }) {
  const [, startTransition] = useTransition();
  const [resolved, setResolved] = useState<Record<string, Patch>>({});

  const base = useMemo(
    () => problems.map((p) => (resolved[p.slug] ? { ...p, ...resolved[p.slug] } : p)),
    [problems, resolved],
  );

  const [rows, patchRow] = useOptimistic(base, (state, patch: Patch & { slug: string }) =>
    state.map((p) => {
      if (p.slug !== patch.slug) return p;
      const schedules = patch.outcome === "editorial" || patch.outcome === "failed";
      return {
        ...p,
        ...patch,
        // a clean or hinted re-solve clears an outstanding redo immediately
        redoDueDay: "redoDueDay" in patch ? patch.redoDueDay : schedules ? p.redoDueDay : null,
        redoPending: schedules,
      };
    }),
  );

  function onOutcome(slug: string, outcome: Outcome) {
    startTransition(async () => {
      patchRow({ slug, outcome });
      const res = await recordOutcome({ problemSlug: slug, outcome });
      setResolved((r) => ({
        ...r,
        [slug]: {
          ...r[slug],
          outcome,
          redoDueDay: res.redoDueDay,
          redoPending: res.redoDueDay != null,
        },
      }));
    });
  }

  function onRevealHint(slug: string) {
    startTransition(async () => {
      patchRow({ slug, hintRevealed: true });
      await revealHint(slug);
      setResolved((r) => ({ ...r, [slug]: { ...r[slug], hintRevealed: true } }));
    });
  }

  return (
    <ul className="space-y-0.5">
      {rows.map((p) => (
        <ProblemRow key={p.slug} p={p} onOutcome={onOutcome} onRevealHint={onRevealHint} />
      ))}
    </ul>
  );
}
