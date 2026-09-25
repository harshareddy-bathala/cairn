"use client";

import { useState } from "react";
import { setHandle } from "@/app/actions/certification";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/use-action";
import { Button } from "./button";
import { Field, Input } from "./field";

/** Claims the public handle. Everything at /u/<handle> is visible without signing in. */
export function HandleClaim({ handle: initial }: { handle: string | null }) {
  const [handle, setLocal] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial);
  const claim = useAction(setHandle);
  const { pending, error, setError } = claim;

  const unchanged = handle.trim().toLowerCase() === (saved ?? "");

  return (
    <form
      className="space-y-2"
      action={async () => {
        const r = await claim.run(handle);
        if (!r.ok) return;
        setSaved(r.value.handle);
        setLocal(r.value.handle);
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <Field label="public handle" className="min-w-0 flex-1 basis-48">
          <Input
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
            className={cn(error && "border-bad")}
          />
        </Field>
        <Button type="submit" pending={pending} disabled={!handle.trim() || unchanged} className="py-2">
          {pending ? "claiming…" : saved && unchanged ? "claimed" : "claim"}
        </Button>
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
