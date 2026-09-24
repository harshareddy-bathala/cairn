"use client";

import "./globals.css";

/**
 * The last resort: an error in the root layout itself, where the app's own
 * error boundary cannot reach. It replaces the whole document, so it brings its
 * own <html> and stylesheet, and stays on the dark ground rather than flashing
 * a white page at someone at 5 AM.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <title>Something went wrong · Cairn</title>
        <main className="flex min-h-dvh items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm space-y-4 text-center">
            <p className="legend">something went wrong{error.digest ? ` · ref ${error.digest}` : ""}</p>
            <h1 className="text-xl text-hi">Cairn could not load</h1>
            <p className="note text-lo">
              Usually a request that did not come back. Nothing you saved is lost.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              className="ctl rounded-[3px] border border-line px-4 py-2 text-sm text-hi hover:border-phos hover:text-phos"
            >
              try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
