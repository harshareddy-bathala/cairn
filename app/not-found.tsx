import Link from "next/link";
import { Mark } from "@/components/instrument/mark";

export const metadata = { title: "Not found" };

/**
 * The 404 for anything outside the app shell — a mistyped URL, a profile or
 * certificate link that points nowhere. Those are often opened by someone who
 * is not signed in, so the way out goes to `/`, which sends each reader to
 * wherever they are allowed to be.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-5 text-center">
        <Mark className="mx-auto w-fit" />
        <div>
          <p className="legend">404</p>
          <h1 className="mt-1 text-xl text-hi">No trail here</h1>
          <p className="note mt-2 text-lo">
            This link does not lead anywhere — it may be mistyped, or the profile or
            certificate it pointed to no longer exists.
          </p>
        </div>
        <Link
          href="/"
          className="ctl inline-flex items-center rounded-[3px] border border-line px-4 py-2 text-sm text-hi transition-colors duration-[120ms] hover:border-phos hover:text-phos"
        >
          go to Cairn
        </Link>
      </div>
    </main>
  );
}
