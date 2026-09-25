"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bankUnits } from "@/app/actions/onboarding";

/**
 * Banks a whole module you already know — AWS when you hold the certs, say.
 *
 * Two steps, because it is not undoable from here: the first press says what
 * will happen, the second does it. Banked units count toward the map and the
 * phase exam and the plan moves past them; they put no stone on the cairn.
 */
export function BankModule({ unitSlugs, title }: { unitSlugs: string[]; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bank = () =>
    startTransition(async () => {
      setError(null);
      try {
        await bankUnits(unitSlugs);
        setArmed(false);
        router.refresh();
      } catch {
        setError("Could not bank the module. Try again.");
      }
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-md note text-lo">
        {armed
          ? `Mark the ${unitSlugs.length} remaining units of ${title} as already known? They count toward the map and the exam, and the plan moves on — but no stone, and no recall cards.`
          : "Already know this module? Bank it, and the plan stops offering it. The checkpoint is still yours to pass."}
        {error && (
          <span role="alert" className="block text-bad">
            {error}
          </span>
        )}
      </p>
      <div className="flex shrink-0 gap-2">
        {armed && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="ctl inline-flex items-center rounded-[3px] border border-line px-3 py-1.5 text-xs text-mid transition-colors duration-[120ms] hover:text-hi"
          >
            cancel
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={armed ? bank : () => setArmed(true)}
          className="ctl inline-flex items-center rounded-[3px] border border-line px-3 py-1.5 text-xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos disabled:opacity-50"
        >
          {pending ? "banking…" : armed ? `bank ${unitSlugs.length} units` : "bank this module"}
        </button>
      </div>
    </div>
  );
}
