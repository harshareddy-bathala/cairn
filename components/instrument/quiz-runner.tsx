"use client";

import { useState, useTransition } from "react";
import { Quiz } from "./quiz";
import { attachDefense, issueCertificate, startQuiz, submitQuiz } from "@/app/actions/certification";
import type { Paper } from "@/lib/quiz-sessions";
import { cn } from "@/lib/cn";

const input =
  "rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none";
const button =
  "ctl rounded-[3px] border border-line px-3 py-1.5 text-xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos disabled:opacity-50";

/**
 * Draws a sitting from the server and keeps it. A retake asks for a new one;
 * the server resumes an unsubmitted sitting instead, so a reload keeps both
 * the paper and — for an exam — the clock.
 */
function useSitting(kind: "checkpoint" | "exam", slug: string) {
  const [paper, setPaper] = useState<Paper | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const begin = () =>
    startTransition(async () => {
      setError(null);
      const r = await startQuiz(kind, slug).catch(() => null);
      if (!r) return setError("Could not reach the server — try again.");
      if (!r.ok) return setError(r.error);
      setPaper(r);
      window.scrollTo({ top: 0 });
    });

  return { paper, error, pending, begin };
}

export function CheckpointRunner({ moduleSlug, count }: { moduleSlug: string; count: number }) {
  const { paper, error, pending, begin } = useSitting("checkpoint", moduleSlug);

  if (!paper) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={begin} disabled={pending} className={cn("py-2", button)}>
          {pending ? "drawing the paper…" : `begin — ${count} questions`}
        </button>
        <span className="note text-lo">Untimed. Each sitting shuffles the order and the options.</span>
        {error && (
          <p role="alert" className="note w-full text-bad">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Quiz
      // a retake is a new sitting, so the paper remounts with nothing answered
      key={paper.sessionId}
      questions={paper.questions}
      submitLabel="submit checkpoint"
      onSubmit={(a) => submitQuiz(paper.sessionId, a)}
      onRetake={begin}
    />
  );
}

/**
 * The phase exam, and what happens after it.
 *
 * Passing the written paper is only half. The defense recording — you, out
 * loud, explaining one thing from the phase without notes — is what the
 * certificate actually attests to, so it is asked for immediately while the
 * material is fresh.
 */
export function ExamRunner({
  phaseSlug,
  questionCount,
  timeLimitMin,
  alreadyPassed,
  hasDefense,
  certificateId,
  checkpointsPassed,
  checkpointsNeeded,
}: {
  phaseSlug: string;
  questionCount: number;
  timeLimitMin: number;
  alreadyPassed: boolean;
  hasDefense: boolean;
  certificateId: string | null;
  checkpointsPassed: number;
  checkpointsNeeded: number;
}) {
  const [passed, setPassed] = useState(alreadyPassed);
  const [defense, setDefense] = useState(hasDefense);
  const [certId, setCertId] = useState(certificateId);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [taking, setTaking] = useState(!alreadyPassed);
  const [pending, startTransition] = useTransition();
  const sitting = useSitting("exam", phaseSlug);
  const paper = sitting.paper;

  return (
    <div className="space-y-5">
      {taking && paper ? (
        <Quiz
          // a retake is a new sitting: new questions, and the clock starts again
          key={paper.sessionId}
          questions={paper.questions}
          deadlineAt={paper.deadlineAt}
          serverNow={paper.serverNow}
          submitLabel="submit exam"
          onRetake={sitting.begin}
          onSubmit={async (a) => {
            const r = await submitQuiz(paper.sessionId, a);
            if (r.ok && r.passed) setPassed(true);
            return r;
          }}
        />
      ) : taking ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={sitting.begin}
            disabled={sitting.pending}
            className="ctl rounded-[3px] border border-phos px-4 py-2 text-sm text-phos transition-colors duration-[120ms] hover:bg-phos/10 disabled:opacity-50"
          >
            {sitting.pending ? "drawing the paper…" : "begin the exam"}
          </button>
          <span className="note text-lo">
            {questionCount} questions, {timeLimitMin} minutes from the moment you begin. A
            reload keeps the paper and the clock.
          </span>
          {sitting.error && (
            <p role="alert" className="note w-full text-bad">
              {sitting.error}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-mid">
          You have already passed this exam.{" "}
          <button
            type="button"
            onClick={() => setTaking(true)}
            className="tap text-info underline underline-offset-[3px]"
          >
            retake it
          </button>{" "}
          <span className="text-lo">— your best attempt is the one that counts.</span>
        </p>
      )}

      {passed && !certId && (
        <div className="space-y-3 border-t border-line pt-4">
          <div>
            <p className="legend">the defense</p>
            <p className="prose-cairn mt-1 text-sm leading-relaxed text-mid">
              Record yourself, out loud and without notes, explaining one thing from this
              phase for three minutes — a system you built, or a concept you would be
              asked about. Then paste the link. A written quiz cannot tell whether you can
              explain something; this is the part that can.
            </p>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            action={() =>
              startTransition(async () => {
                setError(null);
                const r = await attachDefense(phaseSlug, url.trim()).catch(() => null);
                if (!r) return setError("Could not reach the server — try again.");
                if (!r.ok) return setError(r.error);
                setDefense(true);
              })
            }
          >
            <label className="min-w-0 flex-1 basis-64">
              <span className="legend">recording url</span>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                inputMode="url"
                autoComplete="off"
                placeholder="drive, youtube unlisted, anywhere you can link"
                aria-invalid={error ? true : undefined}
                className={cn("mt-1 w-full", input, error && "border-bad")}
              />
            </label>
            <button type="submit" disabled={pending || !url.trim()} className={cn("py-2", button)}>
              {pending ? "attaching…" : defense ? "replace" : "attach"}
            </button>
          </form>
          {defense && <p className="note text-phos-dim">Recording attached.</p>}
          {defense && checkpointsPassed < checkpointsNeeded && (
            <p className="note text-warn">
              {checkpointsPassed}/{checkpointsNeeded} module checkpoints passed. The exam
              says you can answer questions about the phase; the checkpoints say you did it
              module by module. The certificate needs both.
            </p>
          )}
          {defense && checkpointsPassed >= checkpointsNeeded && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await issueCertificate(phaseSlug).catch(() => null);
                  if (!r) return setError("Could not reach the server — try again.");
                  if (!r.ok) return setError(r.error);
                  setCertId(r.id);
                })
              }
              className="ctl rounded-[3px] border border-phos px-4 py-2 text-sm text-phos transition-colors duration-[120ms] hover:bg-phos/10 disabled:opacity-50"
            >
              {pending ? "issuing…" : "issue the certificate"}
            </button>
          )}
          {error && (
            <p role="alert" className="note text-bad">
              {error}
            </p>
          )}
        </div>
      )}

      {certId && (
        <div className="border-t border-line pt-4">
          <p className="legend">certificate issued</p>
          <a
            href={`/c/${certId}`}
            className="mt-1 block break-all py-1 text-sm text-phos underline underline-offset-[3px]"
          >
            /c/{certId}
          </a>
        </div>
      )}
    </div>
  );
}
