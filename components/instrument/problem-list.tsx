"use client";

import { ProblemRow, type ProblemRowData } from "./problem-row";

/** Client wrapper. Outcome persistence is wired to server actions on day 3. */
export function ProblemList({ problems }: { problems: ProblemRowData[] }) {
  return (
    <ul className="space-y-0.5">
      {problems.map((p) => (
        <ProblemRow key={p.slug} p={p} />
      ))}
    </ul>
  );
}
