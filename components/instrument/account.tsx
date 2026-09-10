"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/cn";

export type AccountInfo = {
  email: string;
  name: string | null;
  handle: string | null;
  image: string | null;
};

/** the letter shown when there is no avatar — the account's own initial */
function initial(a: AccountInfo) {
  return (a.name?.trim() || a.email).charAt(0).toUpperCase();
}

/**
 * Who you are signed in as, and the way out.
 *
 * The rail used to end at the day count, so a second account and the first
 * looked identical — the same trail, the same glyphs, no email anywhere, and
 * no way to leave without clearing cookies. Cairn is invite-only and people do
 * hold two accounts, so the identity has to be visible, not inferred.
 */
export function AccountMenu({ account }: { account: AccountInfo }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Signed in as ${account.email}`}
        title={account.email}
        className={cn(
          "tap flex h-7 w-7 items-center justify-center rounded-full border text-2xs uppercase transition-colors duration-[120ms]",
          open
            ? "border-phos text-phos"
            : "border-line-soft text-lo hover:border-line hover:text-mid",
        )}
      >
        {initial(account)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-0 left-[calc(100%+10px)] z-40 w-60 rounded-[3px] border border-line bg-ink-850 p-3 shadow-lg"
        >
          <p className="legend">signed in as</p>
          <p className="mt-1 truncate text-sm text-hi" title={account.email}>
            {account.email}
          </p>
          {account.handle ? (
            <Link
              href={`/u/${account.handle}`}
              onClick={() => setOpen(false)}
              className="mt-0.5 block truncate text-2xs text-info underline underline-offset-[3px]"
            >
              @{account.handle}
            </Link>
          ) : (
            <p className="mt-0.5 text-2xs text-lo">no handle yet</p>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-2xs text-lo transition-colors duration-[120ms] hover:text-mid"
            >
              settings
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => void signOutAction())}
              className="rounded-[3px] border border-line-soft px-2.5 py-1 text-2xs text-lo transition-colors duration-[120ms] hover:border-bad hover:text-bad disabled:opacity-40"
            >
              {pending ? "signing out…" : "sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The same identity, laid flat for the phone's "more" sheet. */
export function AccountRow({ account }: { account: AccountInfo }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 border-t border-line-soft px-3 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-soft text-2xs uppercase text-lo">
        {initial(account)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-hi">{account.email}</span>
        <span className="block truncate text-2xs text-lo">
          {account.handle ? `@${account.handle}` : "no handle yet"}
        </span>
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void signOutAction())}
        className="tap shrink-0 rounded-[3px] border border-line-soft px-2.5 py-1.5 text-2xs text-lo transition-colors duration-[120ms] hover:border-bad hover:text-bad disabled:opacity-40"
      >
        {pending ? "…" : "sign out"}
      </button>
    </div>
  );
}
