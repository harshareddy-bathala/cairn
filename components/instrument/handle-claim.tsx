"use client";

import { useState, useTransition } from "react";
import { setHandle } from "@/app/actions/certification";
import { cn } from "@/lib/cn";

/** Claims the public handle. Everything at /u/<handle> is visible without signing in. */
export function HandleClaim({ handle: initial }: { handle: string | null }) {
  const [handle, setLocal] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unchanged = handle.trim().toLowerCase() === (saved ?? "");

  return (
    <form
      className="space-y-2"
      action={() =>
        startTransition(async () => {
          setError(null);
          const r = await setHandle(handle).catch(() => null);
          if (!r) return setError("Could not reach the server — try again.");
          if (!r.ok) return setError(r.error);
          setSaved(r.handle);
          setLocal(r.handle);
        })
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 basis-48">
          <span className="legend">public handle</span>
          <input
            value={handle}
            onChange={(e) => {
              setLocal(e.target.value);
              setError(null);
            }}
            placeholder="lowercase, digits, dashes"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "handle-error" : undefined}
            className={cn(
              "mt-1 w-full rounded-[3px] border bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim focus:outline-none",
              error ? "border-bad" : "border-line",
            )}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !handle.trim() || unchanged}
          className={cn(
            "ctl rounded-[3px] border border-line px-3 py-2 text-xs text-mid",
            "transition-colors duration-[120ms] hover:border-phos hover:text-phos disabled:opacity-50 disabled:hover:border-line disabled:hover:text-mid",
          )}
        >
          {pending ? "claiming…" : saved && unchanged ? "claimed" : "claim"}
        </button>
      </div>
      {saved && (
        <p className="note text-lo">
          live at{" "}
          <a href={`/u/${saved}`} className="text-info underline underline-offset-[3px]">
            /u/{saved}
          </a>{" "}
          — visible to anyone with the link, signed in or not.
        </p>
      )}
      {error && (
        <p id="handle-error" role="alert" className="note text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
