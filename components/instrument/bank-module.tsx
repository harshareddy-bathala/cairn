"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bankUnits } from "@/app/actions/onboarding";
import { useAction } from "@/lib/use-action";
import { Button } from "./button";

/**
 * Banks a whole module you already know — AWS when you hold the certs, say.
 *
 * Two steps, because it is not undoable from here: the first press says what
 * will happen, the second does it. Banked units count toward the map and the
 * phase exam and the plan moves past them; they put no stone on the cairn.
 */
export function BankModule({ unitSlugs, title }: { unitSlugs: string[]; title: string }) {
  const router = useRouter();
  const banking = useAction(bankUnits);
  const { pending, error } = banking;
  const [armed, setArmed] = useState(false);

  const bank = async () => {
    const r = await banking.run(unitSlugs);
    if (!r.ok) return;
    setArmed(false);
    router.refresh();
  };

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
          <Button variant="quiet" onClick={() => setArmed(false)}>
            cancel
          </Button>
        )}
        <Button pending={pending} onClick={armed ? bank : () => setArmed(true)}>
          {pending ? "banking…" : armed ? `bank ${unitSlugs.length} units` : "bank this module"}
        </Button>
      </div>
    </div>
  );
}
