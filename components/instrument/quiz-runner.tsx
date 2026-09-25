"use client";

import { useState } from "react";
import Link from "next/link";
import { Quiz } from "./quiz";
import { attachDefense, issueCertificate, startQuiz, submitQuiz } from "@/app/actions/certification";
import type { Paper } from "@/lib/quiz-sessions";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/use-action";
import { Button } from "./button";
import { Field, Input } from "./field";

/**
 * Draws a sitting from the server and keeps it. A retake asks for a new one;
 * the server resumes an unsubmitted sitting instead, so a reload keeps both
 * the paper and — for an exam — the clock.
 */
function useSitting(kind: "checkpoint" | "exam", slug: string) {
  const [paper, setPaper] = useState<Paper | null>(null);
  const start = useAction(startQuiz);

  const begin = async () => {
    const r = await start.run(kind, slug);
    if (!r.ok) return;
    setPaper(r.value);
    window.scrollTo({ top: 0 });
  };

  return { paper, error: start.error, pending: start.pending, begin };
}

export function CheckpointRunner({
  moduleSlug,
  count,
  nextModule,
}: {
  moduleSlug: string;
  count: number;
  /** the module after this one in its track, if there is one */
  nextModule?: { slug: string; title: string } | null;
}) {
  const { paper, error, pending, begin } = useSitting("checkpoint", moduleSlug);

  if (!paper) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={begin} pending={pending} className="py-2">
          {pending ? "drawing the paper…" : `begin — ${count} questions`}
        </Button>
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
      afterPass={
        <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href={`/module/${moduleSlug}`} className="tap text-mid hover:text-hi">
            ← back to module
          </Link>
          {nextModule && (
            <Link href={`/module/${nextModule.slug}`} className="tap text-hi hover:text-phos">
              <span className="legend mr-2">next module</span>
              {nextModule.title} →
            </Link>
          )}
        </p>
      }
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
  const [taking, setTaking] = useState(!alreadyPassed);
  const attach = useAction(attachDefense);
  const issue = useAction(issueCertificate);
  const error = attach.error ?? issue.error;
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
          <Button variant="primary" size="md" onClick={sitting.begin} pending={sitting.pending}>
            {sitting.pending ? "drawing the paper…" : "begin the exam"}
          </Button>
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
            action={async () => {
              const r = await attach.run(phaseSlug, url.trim());
              if (r.ok) setDefense(true);
            }}
          >
            <Field label="recording url" className="min-w-0 flex-1 basis-64">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  attach.setError(null);
                }}
                inputMode="url"
                autoComplete="off"
                placeholder="drive, youtube unlisted, anywhere you can link"
                aria-invalid={attach.error ? true : undefined}
                className={cn(attach.error && "border-bad")}
              />
            </Field>
            <Button type="submit" pending={attach.pending} disabled={!url.trim()} className="py-2">
              {attach.pending ? "attaching…" : defense ? "replace" : "attach"}
            </Button>
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
            <Button
              variant="primary"
              size="md"
              pending={issue.pending}
              onClick={async () => {
                const r = await issue.run(phaseSlug);
                if (r.ok) setCertId(r.value.id);
              }}
            >
              {issue.pending ? "issuing…" : "issue the certificate"}
            </Button>
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
