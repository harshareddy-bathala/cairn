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
  const [issued, setIssued] = useState<{ token: string; url: string | null; qr: string | null } | null>(null);

  if (!configured) {
    return (
      <p className="text-2xs leading-relaxed text-lo">
        Reminders are not switched on for this deployment yet.
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
        <div className="space-y-3">
          {issued.qr && (
            <div className="flex flex-wrap items-start gap-4">
              {/*
                Telegram is on the phone and this page is usually not. Scanning
                opens the bot with the token already attached, so the only step
                left is pressing Start — nothing to read across and retype.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={issued.qr}
                alt={`QR code linking this account to the Telegram bot`}
                width={144}
                height={144}
                className="shrink-0 rounded-[3px] border border-line"
              />
              <ol className="min-w-40 flex-1 space-y-1.5 text-2xs leading-relaxed text-lo">
                <li>
                  <span className="text-mid">1.</span> Scan this with your phone&rsquo;s camera.
                </li>
                <li>
                  <span className="text-mid">2.</span> Telegram opens on the bot — press{" "}
                  <span className="text-mid">Start</span>.
                </li>
                <li>
                  <span className="text-mid">3.</span> It replies, and this page is linked.
                </li>
              </ol>
            </div>
          )}

          {issued.url && (
            <a
              href={issued.url}
              target="_blank"
              rel="noreferrer"
              className="tap inline-block rounded-[3px] border border-phos-dim px-4 py-1.5 text-sm text-hi hover:border-phos"
            >
              {issued.qr ? "or open Telegram here →" : "open the bot →"}
            </a>
          )}

          <details className="group">
            <summary className="legend cursor-pointer list-none text-lo transition-colors duration-[120ms] hover:text-mid">
              can&rsquo;t scan? send the code instead
            </summary>
            <code className="mt-2 block select-all rounded-[3px] border border-line bg-ink-900 px-3 py-2 text-sm text-phos">
              /start {issued.token}
            </code>
          </details>

          <p className="text-2xs text-lo">Reload this page once the bot replies.</p>
        </div>
      )}
    </div>
  );
}
