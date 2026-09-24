import Link from "next/link";
import { Panel } from "@/components/instrument/panel";

/**
 * A unit, module or checkpoint that does not exist — inside the app shell, so
 * the navigation is still there and the way back is one tap, not the browser's
 * back button on a white Next.js default.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <p className="legend">404 · off the trail</p>
        <h1 className="mt-1 text-2xl text-hi">Nothing here</h1>
      </header>
      <Panel legend="not found">
        <p className="note text-mid">
          This page does not exist — a unit or module may have been renamed since the link
          was made. Nothing you have done is affected.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/today"
            className="ctl inline-flex items-center rounded-[3px] border border-line px-4 py-1.5 text-sm text-hi transition-colors duration-[120ms] hover:border-phos hover:text-phos"
          >
            back to today
          </Link>
          <Link
            href="/roadmap"
            className="ctl inline-flex items-center rounded-[3px] border border-line-soft px-4 py-1.5 text-sm text-mid transition-colors duration-[120ms] hover:border-line hover:text-hi"
          >
            open the trail
          </Link>
        </div>
      </Panel>
    </div>
  );
}
