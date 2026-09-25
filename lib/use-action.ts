"use client";

import { useCallback, useRef, useState, useTransition } from "react";

export const OFFLINE = "Could not reach the server — nothing was saved. Try again.";

/** a successful result: whatever the action returns, minus its refusal shape */
type Success<R> = Exclude<R, { ok: false }>;
type Outcome<R> = { ok: true; value: Success<R> } | { ok: false };

/**
 * One way to call a server action from a control.
 *
 * Before this, each component did its own thing: some swallowed the error with
 * `.catch(() => {})`, some let it throw into the error boundary, some ignored
 * `{ ok: false }` results entirely, and a double click submitted twice. Every
 * one of those looked, to the person using it, like the app had silently
 * dropped their input.
 *
 * `run` never throws. A thrown error and an `{ ok: false, error }` result both
 * land in `error`, as a sentence. A second call while one is in flight is
 * ignored — it resolves `{ ok: false }` so a caller that updated optimistically
 * rolls back either way.
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    (...args: A) =>
      new Promise<Outcome<R>>((resolve) => {
        if (busy.current) return resolve({ ok: false });
        busy.current = true;
        setError(null);
        startTransition(async () => {
          try {
            const value = await fn(...args);
            const refused = refusal(value);
            if (refused !== null) {
              setError(refused);
              resolve({ ok: false });
            } else resolve({ ok: true, value: value as Success<R> });
          } catch {
            setError(OFFLINE);
            resolve({ ok: false });
          } finally {
            busy.current = false;
          }
        });
      }),
    [fn],
  );

  return { run, pending, error, setError };
}

/** the sentence an `{ ok: false }` result carries, or null when it succeeded */
function refusal(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("ok" in value) || value.ok !== false) return null;
  const e = "error" in value ? value.error : null;
  return typeof e === "string" && e ? e : "That could not be saved. Try again.";
}
