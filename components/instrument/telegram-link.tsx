"use client";

import { useState, useTransition } from "react";
import { startTelegramLink, unlinkTelegram } from "@/app/actions/reminders";
import { cn } from "@/lib/cn";

/**
 * The handshake, in one button.
 *
 * Deep link where the bot username is known, a copyable `/start <code>` where it
 * is not — the code is the same either way, and it is spent on first use.
 */
export function TelegramLink({ linked, configured }: { linked: boolean; configured: boolean }) {
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<{ token: string; url: string | null } | null>(null);

  if (!configured) {
    return (
      <p className="text-2xs leading-relaxed text-lo">
        No bot token on this deployment. Set <code className="text-mid">TELEGRAM_BOT_TOKEN</code> and{" "}
        <code className="text-mid">TELEGRAM_BOT_USERNAME</code>, then run{" "}
        <code className="text-mid">npm run telegram -- setup</code>.
      </p>
    );
  }

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-hi">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-phos align-middle" />
          Chat linked
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await unlinkTelegram()))}
          className="legend px-1 text-lo hover:text-bad disabled:opacity-40"
        >
          unlink
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!issued ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-2xs leading-relaxed text-lo">
            Reminders arrive in Telegram. One code, used once, ties this account to that chat.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => setIssued(await startTelegramLink()))}
            className={cn(
              "shrink-0 rounded-[3px] border border-line px-4 py-1.5 text-sm text-mid",
              "transition-colors duration-[120ms] hover:border-phos-dim hover:text-hi",
              "disabled:opacity-40",
            )}
          >
            {pending ? "…" : "link Telegram"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {issued.url ? (
            <a
              href={issued.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-[3px] border border-phos-dim px-4 py-1.5 text-sm text-hi hover:border-phos"
            >
              open the bot →
            </a>
          ) : (
            <p className="text-2xs text-lo">Send this to the bot:</p>
          )}
          <code className="block select-all rounded-[3px] border border-line bg-ink-900 px-3 py-2 text-sm text-phos">
            /start {issued.token}
          </code>
          <p className="text-2xs text-lo">Reload this page once the bot replies.</p>
        </div>
      )}
    </div>
  );
}
