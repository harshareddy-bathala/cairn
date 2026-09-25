"use client";

import { useEffect, useState } from "react";

const KEY = "cairn:first-run-dismissed";

/**
 * The model, explained once.
 *
 * Cairn runs on a few ideas that are not obvious from the screen: days are
 * counted by closing them, not by the calendar; nothing is ever overdue; the
 * pace buttons reshape today; the deck fills from finished units. People who
 * missed these read the app as broken — "why is it still day 4?" — so they are
 * said here, on Today, until dismissed.
 *
 * Dismissal is per browser. It is a convenience, not a record: losing it costs
 * one re-read, and it keeps a first-run flag out of the schema.
 */
export function FirstRun() {
  // hidden until the stored answer is known, so a returning user never sees a flash
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode: it will show again next time, which is harmless */
    }
  }

  return (
    <section
      aria-labelledby="first-run-title"
      className="rounded-panel border border-line-soft bg-ink-900/60 p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="first-run-title" className="legend text-mid">
          how this works
        </h2>
        <button
          type="button"
          onClick={dismiss}
          className="tap legend text-lo transition-colors duration-[120ms] hover:text-hi"
        >
          got it
        </button>
      </div>
      <ul className="prose-cairn mt-3 space-y-2 text-sm text-mid">
        <li>
          <span className="text-hi">A stone is a closed day.</span> The day number moves only
          when you close a day, so a skipped week leaves you exactly where you were.
        </li>
        <li>
          <span className="text-hi">Nothing is ever overdue.</span> Plans, recall cards and
          weekly quotas are all counted in active days, not calendar days.
        </li>
        <li>
          <span className="text-hi">Catch-up and bad day reshape today.</span> 1.5× and 2× pull
          the next units forward; bad day shrinks today to one problem and the log, and the
          streak still counts it.
        </li>
        <li>
          <span className="text-hi">Recall cards come from finished units.</span> Mark a unit
          complete and its cards join the Review deck on your next active day.
        </li>
      </ul>
    </section>
  );
}
