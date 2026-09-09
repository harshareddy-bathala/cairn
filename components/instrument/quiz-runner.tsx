"use client";

import { useState } from "react";
import { Quiz, type QuizQuestion, type QuizResult } from "./quiz";
import { submitCheckpoint, submitExam, attachDefense, issueCertificate } from "@/app/actions/certification";
import { cn } from "@/lib/cn";

const input =
  "rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none";
const button =
  "rounded-[3px] border border-line px-3 py-1.5 text-2xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos";

export function CheckpointRunner({
  moduleSlug,
  questions,
}: {
  moduleSlug: string;
  questions: QuizQuestion[];
}) {
  return (
    <Quiz
      questions={questions}
      submitLabel="submit checkpoint"
      onSubmit={(a) => submitCheckpoint(moduleSlug, a) as Promise<QuizResult>}
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
  seed,
  questions,
  timeLimitMin,
  alreadyPassed,
  hasDefense,
  certificateId,
  checkpointsPassed,
  checkpointsNeeded,
}: {
  phaseSlug: string;
  seed: number;
  questions: QuizQuestion[];
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

  return (
    <div className="space-y-5">
      {taking ? (
        <Quiz
          questions={questions}
          timeLimitMin={timeLimitMin}
          submitLabel="submit exam"
          onSubmit={async (a) => {
            const r = (await submitExam(phaseSlug, seed, a)) as QuizResult;
            if (r.passed) setPassed(true);
            return r;
          }}
        />
      ) : (
        <p className="text-sm text-mid">
          You have already passed this exam.{" "}
          <button type="button" onClick={() => setTaking(true)} className="text-info underline underline-offset-[3px]">
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
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-64 flex-1">
              <span className="legend">recording url</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="drive, youtube unlisted, anywhere you can link"
                className={cn("mt-1 w-full", input)}
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  await attachDefense(phaseSlug, url.trim());
                  setDefense(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "could not attach that");
                }
              }}
              className={cn("py-2", button)}
            >
              attach
            </button>
          </div>
          {defense && checkpointsPassed < checkpointsNeeded && (
            <p className="text-2xs leading-relaxed text-warn">
              {checkpointsPassed}/{checkpointsNeeded} module checkpoints passed. The exam
              says you can answer questions about the phase; the checkpoints say you did it
              module by module. The certificate needs both.
            </p>
          )}
          {defense && checkpointsPassed >= checkpointsNeeded && (
            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  const r = await issueCertificate(phaseSlug);
                  setCertId(r.id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "could not issue it");
                }
              }}
              className="rounded-[3px] border border-phos px-4 py-2 text-sm text-phos transition-colors duration-[120ms] hover:bg-phos/10"
            >
              issue the certificate
            </button>
          )}
          {error && <p className="text-2xs text-bad">{error}</p>}
        </div>
      )}

      {certId && (
        <div className="border-t border-line pt-4">
          <p className="legend">certificate issued</p>
          <a
            href={`/c/${certId}`}
            className="mt-1 block text-sm text-phos underline underline-offset-[3px]"
          >
            /c/{certId}
          </a>
        </div>
      )}
    </div>
  );
}
