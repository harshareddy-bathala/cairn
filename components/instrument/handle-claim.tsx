"use client";

import { useState } from "react";
import { setHandle } from "@/app/actions/certification";
import { cn } from "@/lib/cn";

/** Claims the public handle. Everything at /u/<handle> is visible without signing in. */
export function HandleClaim({ handle: initial }: { handle: string | null }) {
  const [handle, setLocal] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="legend">public handle</span>
          <input
            value={handle}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="lowercase, digits, dashes"
            className="mt-1 w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={async () => {
            setError(null);
            try {
              const r = await setHandle(handle);
              setSaved(r.handle);
            } catch (e) {
              setError(e instanceof Error ? e.message : "could not save that");
            }
          }}
          className={cn(
            "rounded-[3px] border border-line px-3 py-2 text-2xs text-mid",
            "transition-colors duration-[120ms] hover:border-phos hover:text-phos",
          )}
        >
          claim
        </button>
      </div>
      {saved && (
        <p className="text-2xs text-lo">
          live at{" "}
          <a href={`/u/${saved}`} className="text-info underline underline-offset-[3px]">
            /u/{saved}
          </a>{" "}
          — visible to anyone with the link, signed in or not.
        </p>
      )}
      {error && <p className="text-2xs text-bad">{error}</p>}
    </div>
  );
}
