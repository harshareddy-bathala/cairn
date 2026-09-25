"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Panel } from "@/components/instrument/panel";
import { buttonClass } from "@/components/instrument/button";

/**
 * When a page, or an action on it, throws.
 *
 * There was no boundary at all, so one rejected server action — a link the
 * server refused, a dropped connection mid-grade — replaced the whole app with
 * Next's white "Application error" screen. This keeps the navigation, says what
 * happened in plain words, and offers the retry that usually fixes it: most
 * failures here are a database round trip that did not come back.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <p className="legend">something went wrong</p>
        <h1 className="mt-1 text-2xl text-hi">That did not go through</h1>
      </header>
      <Panel legend="error" aux={error.digest ? `ref ${error.digest}` : undefined}>
        <p className="note text-mid">
          This page hit an error, usually a request to the server that did not come back.
          Anything you had already saved is safe. Trying again normally fixes it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => retry()}
            className={buttonClass("ghost", "md", "py-1.5 text-hi")}
          >
            try again
          </button>
          <Link
            href="/today"
            className={buttonClass("quiet", "md", "py-1.5")}
          >
            back to today
          </Link>
        </div>
      </Panel>
    </div>
  );
}
