"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { acceptPledge, setDeliverable, setRepoUrl } from "@/app/actions/sidetracks";
import type { ProjectView } from "@/lib/sidetracks";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

/**
 * A project as a checklist of deliverables, each with a definition of done.
 *
 * The definition is shown, not hidden behind a tooltip, because the failure
 * mode here is not forgetting what to do — it is deciding that "I worked on it"
 * counts as finished.
 */
export function ProjectBoard({ project }: { project: ProjectView }) {
  const reduce = useReducedMotion();
  const [, startTransition] = useTransition();
  const [state, setState] = useState(project);
  const [repo, setRepo] = useState(project.repoUrl ?? "");
  const [open, setOpen] = useState<string | null>(null);

  const done = state.deliverables.filter((d) => d.doneOnDay != null).length;
  const total = state.deliverables.length;
  const pledged = Boolean(state.pledgeAcceptedAt);

  function toggle(slug: string, next: boolean) {
    startTransition(async () => {
      setState((s) => ({
        ...s,
        deliverables: s.deliverables.map((d) =>
          d.slug === slug ? { ...d, doneOnDay: next ? (d.doneOnDay ?? 0) : null } : d,
        ),
      }));
      const res = await setDeliverable(slug, next);
      setState((s) => ({
        ...s,
        deliverables: s.deliverables.map((d) =>
          d.slug === slug ? { ...d, doneOnDay: res.done ? res.dayIndex : null } : d,
        ),
      }));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="max-w-xl text-2xs leading-relaxed text-lo">{state.summary}</p>
        <span className="legend shrink-0 tabular-nums">
          {done}/{total}
        </span>
      </div>

      {!pledged ? (
        <div className="rounded-[3px] border border-line-soft bg-ink-900/60 p-3">
          <p className="legend">the rule that makes this count</p>
          <p className="prose-cairn mt-1.5 text-sm leading-relaxed text-mid">
            Hand-typed. Zero AI code generation. An interviewer will ask you to explain a
            line you wrote four weeks ago, and this is the only thing that makes that
            survivable.
          </p>
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                setState((s) => ({ ...s, pledgeAcceptedAt: new Date().toISOString() }));
                await acceptPledge(state.slug);
              });
            }}
            className="mt-3 rounded-[3px] border border-line px-3 py-1.5 text-2xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos"
          >
            I accept — no AI codegen in {state.name}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <span className="legend pb-1.5 text-phos-dim">◈ no-AI pledge accepted</span>
          <label className="min-w-56 flex-1">
            <span className="legend">repo</span>
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              onBlur={() => {
                if (repo !== (state.repoUrl ?? "")) {
                  startTransition(async () => {
                    setState((s) => ({ ...s, repoUrl: repo }));
                    await setRepoUrl(state.slug, repo);
                  });
                }
              }}
              placeholder="github.com/…"
              className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none"
            />
          </label>
        </div>
      )}

      <ul className="divide-y divide-line-soft border-t border-line-soft">
        {state.deliverables.map((d) => {
          const isDone = d.doneOnDay != null;
          const isOpen = open === d.slug;
          return (
            <li key={d.slug} className={cn(isDone && "opacity-60")}>
              <div className="flex items-baseline gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(d.slug, !isDone)}
                  aria-pressed={isDone}
                  className={cn(
                    "w-4 shrink-0 text-center text-sm leading-none transition-colors duration-[120ms]",
                    isDone ? "text-phos" : "text-lo hover:text-mid",
                  )}
                >
                  {isDone ? "✓" : "▢"}
                </button>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", isDone ? "text-mid" : "text-hi")}>
                    {d.title}
                  </span>
                  {isDone && d.doneOnDay ? (
                    <span className="block text-2xs text-lo">
                      day {String(d.doneOnDay).padStart(3, "0")}
                    </span>
                  ) : null}
                </span>
                <span className="legend shrink-0 tabular-nums">~{d.estMinutes}m</span>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : d.slug)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "collapse" : "definition of done"}
                  className="w-4 shrink-0 text-center text-2xs text-lo transition-colors duration-[120ms] hover:text-mid"
                >
                  {isOpen ? "▾" : "▸"}
                </button>
              </div>
              {isOpen && (
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.base, ease: EASE }}
                  className="prose-cairn pb-3 pl-7 text-sm leading-relaxed text-mid"
                >
                  <span className="legend mr-2">done means</span>
                  {d.definitionOfDone}
                </motion.p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
