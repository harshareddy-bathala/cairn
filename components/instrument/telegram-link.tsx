"use client";

import { useState } from "react";
import { startTelegramLink, unlinkTelegram } from "@/app/actions/reminders";
import { useAction } from "@/lib/use-action";
import { buttonClass } from "./button";
import { Button } from "./button";

/**
 * The handshake, in one button.
 *
 * Deep link where the bot username is known, a copyable `/start <code>` where it
 * is not — the code is the same either way, and it is spent on first use.
 */
export function TelegramLink({ linked, configured }: { linked: boolean; configured: boolean }) {
  const link = useAction(startTelegramLink);
  const unlink = useAction(unlinkTelegram);
  const pending = link.pending || unlink.pending;
  const error = link.error ?? unlink.error;
  const [issued, setIssued] = useState<{ token: string; url: string | null; qr: string | null } | null>(null);

  if (!configured) {
    return (
      <p className="note text-lo">
        Reminders are not switched on for this deployment yet.
      </p>
    );
  }

  if (linked) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-hi">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-phos align-middle" />
          Chat linked
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => void unlink.run()}
          className="legend px-1 text-lo hover:text-bad disabled:opacity-40"
        >
          unlink
        </button>
        {error && (
          <p role="alert" className="note basis-full text-bad">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!issued ? (
        <div className="flex items-center justify-between gap-4">
          <p className="note text-lo">
            Reminders arrive in Telegram. One code, used once, ties this account to that chat.
          </p>
          <Button
            size="md"
            pending={pending}
            onClick={async () => {
              const r = await link.run();
              if (r.ok) setIssued(r.value);
            }}
            className="shrink-0 py-1.5"
          >
            {pending ? "…" : "link Telegram"}
          </Button>
        </div>
      ) : null}
      {!issued && error && (
        <p role="alert" className="note text-bad">
          {error}
        </p>
      )}
      {issued && (
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
              <ol className="min-w-40 flex-1 space-y-1.5 note text-lo">
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
              className={buttonClass("primary", "md", "py-1.5")}
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

          <p className="note text-lo">Reload this page once the bot replies.</p>
        </div>
      )}
    </div>
  );
}
