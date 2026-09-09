"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  addApplication,
  addContact,
  logMock,
  rehearseStory,
  saveStory,
  setApplicationStatus,
} from "@/app/actions/sidetracks";
import type { CareerView } from "@/lib/sidetracks";
import { CADENCE, STAR_PROMPTS } from "@/content/cadence";
import { safeUrl } from "@/lib/safe-url";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";

const STATUSES = [
  "applied", "responded", "screening", "interviewing", "offer", "rejected", "ghosted",
] as const;

const STATUS_TONE: Record<string, string> = {
  applied: "text-lo",
  responded: "text-info",
  screening: "text-info",
  interviewing: "text-warn",
  offer: "text-phos",
  rejected: "text-bad",
  ghosted: "text-bad",
};

const input =
  "rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none";
const button =
  "rounded-[3px] border border-line px-3 py-1.5 text-2xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos";

/**
 * Applications. The counter exists because this lane dies silently —
 * there is no artefact for a week of not applying.
 */
export function ApplicationDesk({
  applications: initial,
  journeyWeek,
}: {
  applications: CareerView["applications"];
  journeyWeek: number;
}) {
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");

  return (
    <div className="space-y-4">
      <form
        action={() =>
          startTransition(async () => {
            if (!company.trim() || !role.trim()) return;
            const draft = {
              id: -Date.now(),
              company: company.trim(),
              role: role.trim(),
              source: "direct",
              status: "applied" as const,
              journeyWeek,
              link: link.trim() || null,
            };
            setRows((r) => [draft, ...r]);
            setCompany("");
            setRole("");
            setLink("");
            const res = await addApplication({
              company: draft.company, role: draft.role, link: draft.link ?? undefined,
            });
            setRows((r) =>
              r.map((x) =>
                x.id === draft.id
                  ? { ...x, id: res.id, journeyWeek: res.journeyWeek, link: res.link }
                  : x,
              ),
            );
          })
        }
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-36 flex-1">
          <span className="legend">company</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <label className="min-w-36 flex-1">
          <span className="legend">role</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <label className="min-w-36 flex-1">
          <span className="legend">link</span>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="optional" className={cn("mt-1 w-full", input)} />
        </label>
        <button type="submit" className={cn("py-2", button)}>
          sent
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-2xs leading-relaxed text-lo">
          Nothing sent yet. This is the lane that quietly stays at zero while everything
          else looks healthy.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {rows.map((a) => {
            const href = safeUrl(a.link);
            return (
            <li key={a.id} className="flex items-baseline gap-3 py-2">
              <span className="legend w-10 shrink-0 tabular-nums">
                w{String(a.journeyWeek).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="tap block truncate text-sm text-hi underline-offset-4 hover:underline"
                  >
                    {a.company}
                  </a>
                ) : (
                  <span className="block truncate text-sm text-hi">{a.company}</span>
                )}
                <span className="block truncate text-2xs text-lo">{a.role}</span>
              </span>
              <select
                value={a.status}
                onChange={(e) => {
                  const next = e.target.value;
                  startTransition(async () => {
                    setRows((r) =>
                      r.map((x) => (x.id === a.id ? { ...x, status: next as typeof a.status } : x)),
                    );
                    await setApplicationStatus(a.id, next);
                  });
                }}
                className={cn(
                  "shrink-0 rounded-[3px] border border-line bg-ink-900 px-1.5 py-1 text-2xs focus:border-phos-dim focus:outline-none",
                  STATUS_TONE[a.status],
                )}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="text-hi">
                    {s}
                  </option>
                ))}
              </select>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** People, not postings. Referrals move more than applications do. */
export function ContactDesk({ contacts: initial }: { contacts: CareerView["contacts"] }) {
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  return (
    <div className="space-y-3">
      <form
        action={() =>
          startTransition(async () => {
            if (!name.trim()) return;
            const draft = {
              id: -Date.now(), name: name.trim(), company: company.trim() || null,
              channel: "linkedin", lastTouchWeek: null,
            };
            setRows((r) => [draft, ...r]);
            setName("");
            setCompany("");
            await addContact({ name: draft.name, company: draft.company ?? undefined });
          })
        }
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-36 flex-1">
          <span className="legend">name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <label className="min-w-36 flex-1">
          <span className="legend">company</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <button type="submit" className={cn("py-2", button)}>
          add
        </button>
      </form>

      {rows.length > 0 && (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {rows.map((c) => (
            <li key={c.id} className="flex items-baseline gap-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm text-hi">{c.name}</span>
              <span className="min-w-0 flex-1 truncate text-2xs text-lo">{c.company ?? "—"}</span>
              <span className="legend shrink-0">{c.channel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Sessions logged against this journey week's cadence. */
export function MockDesk({
  mocks: initial,
  journeyWeek,
}: {
  mocks: CareerView["mocks"];
  journeyWeek: number;
}) {
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [kind, setKind] = useState<string>("dsa_pair");
  const [score, setScore] = useState("");

  const available = CADENCE.filter((q) => journeyWeek >= q.fromWeek);
  const label = (k: string) => CADENCE.find((q) => q.kind === k)?.label ?? k;

  return (
    <div className="space-y-3">
      <form
        action={() =>
          startTransition(async () => {
            const draft = {
              id: -Date.now(), kind: kind as never, journeyWeek, dayIndex: 0,
              score: score.trim() || null, notes: null,
            };
            setRows((r) => [draft, ...r]);
            setScore("");
            const res = await logMock({ kind: kind as never, score: score.trim() || undefined });
            setRows((r) =>
              r.map((x) => (x.id === draft.id ? { ...x, dayIndex: res.dayIndex, journeyWeek: res.journeyWeek } : x)),
            );
          })
        }
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-44 flex-1">
          <span className="legend">session</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={cn("mt-1 w-full", input)}
          >
            {available.map((q) => (
              <option key={q.kind} value={q.kind}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <label className="w-28">
          <span className="legend">score</span>
          <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="optional" className={cn("mt-1 w-full", input)} />
        </label>
        <button type="submit" className={cn("py-2", button)}>
          log
        </button>
      </form>

      {rows.length > 0 && (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {rows.slice(0, 10).map((m) => (
            <li key={m.id} className="flex items-baseline gap-3 py-1.5">
              <span className="legend w-10 shrink-0 tabular-nums">
                w{String(m.journeyWeek).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-hi">{label(m.kind)}</span>
              <span className="legend shrink-0 tabular-nums">{m.score ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The STAR bank.
 *
 * Companies at this band reject for communication more often than for DSA, and
 * the rehearsal counter is deliberately separate from the writing: a story you
 * have written and never said out loud is not ready.
 */
export function StarBank({ stories: initial }: { stories: CareerView["stories"] }) {
  const reduce = useReducedMotion();
  const [, startTransition] = useTransition();
  const [stories, setStories] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);

  const byPrompt = new Map(stories.map((s) => [s.prompt, s]));

  return (
    <ul className="divide-y divide-line-soft">
      {STAR_PROMPTS.map((prompt) => {
        const s = byPrompt.get(prompt);
        const ready = Boolean(s?.result?.trim());
        const isOpen = open === prompt;
        return (
          <li key={prompt}>
            <div className="flex items-baseline gap-3 py-2.5">
              <span
                className={cn(
                  "tap w-4 shrink-0 text-center text-sm leading-none",
                  ready ? "text-phos" : "text-lo",
                )}
                aria-hidden
              >
                {ready ? "✓" : "▢"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : prompt)}
                aria-expanded={isOpen}
                className="tap min-w-0 flex-1 text-left text-sm text-hi transition-colors duration-[120ms] hover:text-phos"
              >
                {prompt}
              </button>
              {s && s.rehearsedCount > 0 && (
                <span className="legend shrink-0 tabular-nums" title="times rehearsed out loud">
                  ×{s.rehearsedCount}
                </span>
              )}
            </div>
            {isOpen && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE }}
                className="pb-3 pl-7"
              >
                <StarForm
                  prompt={prompt}
                  story={s}
                  onSaved={(next) =>
                    setStories((all) => {
                      const rest = all.filter((x) => x.prompt !== prompt);
                      return [...rest, next];
                    })
                  }
                  onRehearsed={() =>
                    startTransition(async () => {
                      setStories((all) =>
                        all.map((x) =>
                          x.prompt === prompt ? { ...x, rehearsedCount: x.rehearsedCount + 1 } : x,
                        ),
                      );
                      await rehearseStory(prompt);
                    })
                  }
                />
              </motion.div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StarForm({
  prompt,
  story,
  onSaved,
  onRehearsed,
}: {
  prompt: string;
  story?: CareerView["stories"][number];
  onSaved: (s: CareerView["stories"][number]) => void;
  onRehearsed: () => void;
}) {
  const [, startTransition] = useTransition();
  const [v, setV] = useState({
    situation: story?.situation ?? "",
    task: story?.task ?? "",
    action: story?.action ?? "",
    result: story?.result ?? "",
  });

  const fields: { key: keyof typeof v; label: string; hint: string }[] = [
    { key: "situation", label: "situation", hint: "where and when, in one line" },
    { key: "task", label: "task", hint: "what was actually on you" },
    { key: "action", label: "action", hint: "what you did — verbs, not the team's" },
    { key: "result", label: "result", hint: "a number if you have one" },
  ];

  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <label key={f.key} className="block">
          <span className="legend">
            {f.label} <span className="text-lo/70">· {f.hint}</span>
          </span>
          <textarea
            value={v[f.key]}
            onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
            rows={2}
            className={cn("prose-cairn mt-1 w-full resize-none", input)}
          />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              onSaved({
                id: story?.id ?? -Date.now(),
                prompt,
                ...v,
                rehearsedCount: story?.rehearsedCount ?? 0,
              });
              await saveStory({ prompt, ...v });
            })
          }
          className={button}
        >
          save
        </button>
        <button type="button" onClick={onRehearsed} className={button}>
          rehearsed out loud
        </button>
        <span className="text-2xs text-lo">
          Say it standing up. Reading it back silently does not count.
        </span>
      </div>
    </div>
  );
}
