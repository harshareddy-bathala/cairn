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
import { useAction } from "@/lib/use-action";
import { fmtWeek } from "@/lib/format";

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
  "ctl rounded-[3px] border border-line px-3 py-1.5 text-xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos";

const OFFLINE = "Could not reach the server — nothing was saved. Try again.";

/** the reason a form did not save, next to the form rather than instead of the page */
function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="note text-bad">
      {error}
    </p>
  );
}

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
  const add = useAction(addApplication);
  const setStatus = useAction(setApplicationStatus);
  const [rows, setRows] = useState(initial);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        action={async () => {
            if (add.pending) return;
            if (!company.trim() || !role.trim()) {
              setError("Company and role are both needed.");
              return;
            }
            setError(null);
            const typed = { company, role, link };
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
            const res = await add.run({
              company: draft.company, role: draft.role, link: draft.link ?? undefined,
            });
            if (!res.ok) {
              // take the optimistic row back and hand the typing back with it
              setRows((r) => r.filter((x) => x.id !== draft.id));
              setCompany(typed.company);
              setRole(typed.role);
              setLink(typed.link);
              return;
            }
            const saved = res.value;
            setRows((r) =>
              r.map((x) =>
                x.id === draft.id
                  ? { ...x, id: saved.id, journeyWeek: saved.journeyWeek, link: saved.link }
                  : x,
              ),
            );
          }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-0 flex-1 basis-36">
          <span className="legend">company</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <label className="min-w-0 flex-1 basis-36">
          <span className="legend">role</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <label className="min-w-0 flex-1 basis-36">
          <span className="legend">link</span>
          <input
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setError(null);
            }}
            inputMode="url"
            autoCapitalize="none"
            placeholder="optional"
            className={cn("mt-1 w-full", input)}
          />
        </label>
        <button type="submit" disabled={add.pending} className={cn("py-2", button)}>
          log application
        </button>
      </form>
      <FormError error={error ?? add.error ?? setStatus.error} />

      {rows.length === 0 ? (
        <p className="note text-lo">
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
                {fmtWeek(a.journeyWeek, true)}
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
                aria-label={`Status of ${a.company}`}
                onChange={async (e) => {
                  const next = e.target.value;
                  setRows((r) =>
                    r.map((x) => (x.id === a.id ? { ...x, status: next as typeof a.status } : x)),
                  );
                  const res = await setStatus.run(a.id, next);
                  if (!res.ok) {
                    setRows((r) => r.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)));
                  }
                }}
                className={cn(
                  "shrink-0 rounded-[3px] border border-line bg-ink-900 px-1.5 py-1 text-xs focus:border-phos-dim focus:outline-none",
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
  const add = useAction(addContact);
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <form
        action={async () => {
            if (add.pending) return;
            if (!name.trim()) {
              setError("Add a name.");
              return;
            }
            setError(null);
            const draft = {
              id: -Date.now(), name: name.trim(), company: company.trim() || null,
              channel: "linkedin", lastTouchWeek: null,
            };
            setRows((r) => [draft, ...r]);
            setName("");
            setCompany("");
            const res = await add.run({
              name: draft.name, company: draft.company ?? undefined,
            });
            if (!res.ok) {
              setRows((r) => r.filter((x) => x.id !== draft.id));
              setName(draft.name);
              setCompany(draft.company ?? "");
            }
          }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-0 flex-1 basis-36">
          <span className="legend">name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <label className="min-w-0 flex-1 basis-36">
          <span className="legend">company</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={cn("mt-1 w-full", input)} />
        </label>
        <button type="submit" disabled={add.pending} className={cn("py-2", button)}>
          add
        </button>
      </form>
      <FormError error={error ?? add.error} />

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

type MockRow = CareerView["mocks"][number];

/**
 * The mock-log form on its own. The career desk wraps it with the week's list;
 * a cadence block in the day's plan embeds it directly, preset to the quota
 * that block is chasing, so logging the session is what finishes the block.
 */
export function MockLogForm({
  journeyWeek,
  defaultKind = "dsa_pair",
  onLogged,
}: {
  journeyWeek: number;
  defaultKind?: string;
  onLogged?: (row: MockRow) => void;
}) {
  const log = useAction(logMock);
  const [kind, setKind] = useState<string>(defaultKind);
  const [score, setScore] = useState("");
  const available = CADENCE.filter((q) => journeyWeek >= q.fromWeek);

  return (
    <>
      <form
        action={async () => {
          const typed = score.trim();
          setScore("");
          const res = await log.run({ kind: kind as MockRow["kind"], score: typed || undefined });
          if (!res.ok) return setScore(typed);
          onLogged?.({
            id: -Date.now(), kind: kind as MockRow["kind"], journeyWeek: res.value.journeyWeek,
            dayIndex: res.value.dayIndex, score: typed || null, notes: null,
          });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="min-w-0 flex-1 basis-44">
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
        <button type="submit" disabled={log.pending} className={cn("py-2", button)}>
          log session
        </button>
      </form>
      <FormError error={log.error} />
    </>
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
  const [rows, setRows] = useState(initial);
  const label = (k: string) => CADENCE.find((q) => q.kind === k)?.label ?? k;

  return (
    <div className="space-y-3">
      <MockLogForm journeyWeek={journeyWeek} onLogged={(row) => setRows((r) => [row, ...r])} />

      {rows.length === 0 ? (
        <p className="note text-lo">
          No sessions logged yet. The quotas above are per journey week, so they reset as
          you work, not as the calendar turns.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {rows.slice(0, 10).map((m) => (
            <li key={m.id} className="flex items-baseline gap-3 py-1.5">
              <span className="legend w-10 shrink-0 tabular-nums">
                {fmtWeek(m.journeyWeek, true)}
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
  const rehearse = useAction(rehearseStory);
  const [stories, setStories] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);

  const byPrompt = new Map(stories.map((s) => [s.prompt, s]));

  return (
    <>
    {rehearse.error && (
      <p role="alert" className="note mb-2 text-bad">
        {rehearse.error}
      </p>
    )}
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
                  onRehearsed={async () => {
                    const bump = (d: number) =>
                      setStories((all) =>
                        all.map((x) =>
                          x.prompt === prompt ? { ...x, rehearsedCount: x.rehearsedCount + d } : x,
                        ),
                      );
                    bump(1);
                    const res = await rehearse.run(prompt);
                    if (!res.ok) bump(-1);
                  }}
                />
              </motion.div>
            )}
          </li>
        );
      })}
    </ul>
    </>
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
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
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
            onChange={(e) => {
              setV({ ...v, [f.key]: e.target.value });
              setStatus("idle");
            }}
            rows={2}
            className={cn("prose-cairn mt-1 w-full resize-y", input)}
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
              const ok = await saveStory({ prompt, ...v }).then(
                () => true,
                () => false,
              );
              setStatus(ok ? "saved" : "failed");
            })
          }
          disabled={pending}
          className={cn(button, "disabled:opacity-50")}
        >
          {pending ? "saving…" : status === "saved" ? "saved ✓" : "save"}
        </button>
        <button type="button" onClick={onRehearsed} className={button}>
          rehearsed out loud
        </button>
        <span className="note text-lo">
          Say it standing up. Reading it back silently does not count.
        </span>
        {status === "failed" && (
          <span role="alert" className="note w-full text-bad">
            {OFFLINE}
          </span>
        )}
      </div>
    </div>
  );
}
