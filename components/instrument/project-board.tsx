"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { acceptPledge, setDeliverable, setRepoUrl } from "@/app/actions/sidetracks";
import type { ProjectView } from "@/lib/sidetracks";
import { cn } from "@/lib/cn";
import { safeUrl } from "@/lib/safe-url";
import { DUR, EASE } from "@/lib/motion";

const urlInput =
  "w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none";

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
  const [repoErr, setRepoErr] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const done = state.deliverables.filter((d) => d.doneOnDay != null).length;
  const total = state.deliverables.length;
  const pledged = Boolean(state.pledgeAcceptedAt);

  function toggle(slug: string, next: boolean) {
    startTransition(async () => {
      setState((s) => ({
        ...s,
        deliverables: s.deliverables.map((d) =>
          d.slug === slug
            ? { ...d, doneOnDay: next ? (d.doneOnDay ?? 0) : null, evidenceUrl: next ? d.evidenceUrl : null }
            : d,
        ),
      }));
      // unticking deletes the row, and the evidence with it — so the local copy
      // has to drop it too, or a re-tick would show a link that no longer exists
      const res = await setDeliverable(slug, next);
      setState((s) => ({
        ...s,
        deliverables: s.deliverables.map((d) =>
          d.slug === slug ? { ...d, doneOnDay: res.done ? res.dayIndex : null } : d,
        ),
      }));
    });
  }

  /** Attaches a link to something already ticked. Null means it was rejected. */
  async function saveEvidence(slug: string, url: string): Promise<string | null> {
    const res = await setDeliverable(slug, true, url).catch(() => null);
    if (!res) return null;
    setState((s) => ({
      ...s,
      deliverables: s.deliverables.map((d) =>
        d.slug === slug ? { ...d, evidenceUrl: res.evidenceUrl } : d,
      ),
    }));
    return res.evidenceUrl;
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
            <span className="legend">
              repo
              {repoErr && <span className="ml-2 text-bad">not a link</span>}
            </span>
            <input
              value={repo}
              onChange={(e) => {
                setRepo(e.target.value);
                setRepoErr(false);
              }}
              onBlur={() => {
                if (repo === (state.repoUrl ?? "")) return;
                startTransition(async () => {
                  // the server normalises "github.com/x" and rejects anything that
                  // is not http(s); a rejection has to land somewhere the eye goes,
                  // not in an unhandled promise
                  const res = await setRepoUrl(state.slug, repo).catch(() => null);
                  setRepoErr(res === null);
                  if (res) {
                    setState((st) => ({ ...st, repoUrl: res.repoUrl }));
                    setRepo(res.repoUrl ?? "");
                  }
                });
              }}
              placeholder="github.com/…"
              aria-invalid={repoErr || undefined}
              className={cn("mt-1", urlInput, repoErr && "border-bad")}
            />
            {safeUrl(state.repoUrl) && (
              <a
                href={safeUrl(state.repoUrl)!}
                target="_blank"
                rel="noreferrer noopener"
                className="tap mt-1 inline-block truncate text-2xs text-info underline underline-offset-[3px]"
              >
                open repo
              </a>
            )}
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
                    "tap w-4 shrink-0 text-center text-sm leading-none transition-colors duration-[120ms]",
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
                      {safeUrl(d.evidenceUrl) ? (
                        <span className="ml-2 text-phos-dim">◈ evidence</span>
                      ) : (
                        <span className="ml-2 text-warn">no evidence</span>
                      )}
                    </span>
                  ) : null}
                </span>
                <span className="legend shrink-0 tabular-nums">~{d.estMinutes}m</span>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : d.slug)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "collapse" : "definition of done"}
                  className="tap w-4 shrink-0 text-center text-2xs text-lo transition-colors duration-[120ms] hover:text-mid"
                >
                  {isOpen ? "▾" : "▸"}
                </button>
              </div>
              {isOpen && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.base, ease: EASE }}
                  className="space-y-3 pb-3 pl-7"
                >
                  <p className="prose-cairn text-sm leading-relaxed text-mid">
                    <span className="legend mr-2">done means</span>
                    {d.definitionOfDone}
                  </p>
                  {isDone && (
                    <EvidenceField
                      slug={d.slug}
                      evidenceUrl={d.evidenceUrl}
                      onSave={saveEvidence}
                    />
                  )}
                </motion.div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The link that turns "done" into something checkable.
 *
 * A tick is a self-report; a commit, a screenshot or a deployed URL is not. It
 * stays optional — an artefact that genuinely has no link should not be blocked
 * behind an empty field — but it is asked for every time, and its absence is
 * shown on the row rather than left implicit.
 */
function EvidenceField({
  slug,
  evidenceUrl,
  onSave,
}: {
  slug: string;
  evidenceUrl: string | null;
  onSave: (slug: string, url: string) => Promise<string | null>;
}) {
  const [, startTransition] = useTransition();
  const [v, setV] = useState(evidenceUrl ?? "");
  const [err, setErr] = useState(false);
  const href = safeUrl(evidenceUrl);

  return (
    <div className="space-y-1">
      <label className="block">
        <span className="legend">
          evidence
          {err && <span className="ml-2 text-bad">not a link</span>}
        </span>
        <input
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setErr(false);
          }}
          onBlur={() => {
            const next = v.trim();
            if (!next || next === (evidenceUrl ?? "")) return;
            startTransition(async () => {
              const stored = await onSave(slug, next);
              setErr(stored === null);
              // adopt the normalised form, so the next blur is a no-op rather
              // than a second write of the same link
              if (stored !== null) setV(stored);
            });
          }}
          placeholder="commit, PR, screenshot or deployed URL"
          aria-invalid={err || undefined}
          className={cn("mt-1", urlInput, err && "border-bad")}
        />
      </label>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="tap inline-block truncate text-2xs text-info underline underline-offset-[3px]"
        >
          open evidence
        </a>
      ) : (
        <p className="text-2xs text-lo">
          Optional, and worth the ten seconds — a tick you cannot open is a self-report.
        </p>
      )}
    </div>
  );
}
