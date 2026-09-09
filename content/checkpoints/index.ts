import type { Question } from "./types";
import { dsaQuestions } from "./dsa";
import { devopsQuestions } from "./devops";
import { sdeQuestions } from "./sde";
import { corecsQuestions } from "./corecs";

export type { Question };

/**
 * The question bank.
 *
 * A module checkpoint is that module's questions. A phase exam is drawn from
 * the banks of every module in the phase, which is why there is no separate
 * exam content: an exam you can pass without having passed the checkpoints
 * would be measuring something else.
 */
export const questions: Question[] = [
  ...dsaQuestions,
  ...devopsQuestions,
  ...sdeQuestions,
  ...corecsQuestions,
];

export function questionsForModule(moduleSlug: string) {
  return questions.filter((q) => q.moduleSlug === moduleSlug);
}

/** 80% — a checkpoint you can pass by guessing is not a checkpoint */
export const CHECKPOINT_PASS = 0.8;
/** 75% across a whole phase, plus a defense recording, to earn the certificate */
export const EXAM_PASS = 0.75;
/** how many questions a phase exam draws */
export const EXAM_SIZE = 20;
/** the phase exam unlocks here — at 80% of the phase's units, not 100% */
export const EXAM_UNLOCK = 0.8;
/**
 * And the certificate needs this share of the phase's checkpoints passed.
 *
 * Without it the certificate is issuable by self-placing your way to 80% of the
 * units and passing one quiz — which is a certificate that attests to nothing.
 * The checkpoints are the part that is actually demonstrated.
 */
export const CERT_CHECKPOINTS = 0.8;
