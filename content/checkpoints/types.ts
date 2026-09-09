export type Question = {
  /** stable id — attempts reference it, so never renumber an existing question */
  id: string;
  moduleSlug: string;
  prompt: string;
  /** exactly four; the order is fixed so the answer index stays meaningful */
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  /** shown after you answer, right or wrong — the checkpoint is a teaching moment */
  why: string;
};
