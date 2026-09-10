"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cairn, type Stone } from "./cairn";
import { Mark } from "./mark";
import { NAV, activeHref } from "@/lib/nav";
import { cn } from "@/lib/cn";

/**
 * The desktop rail. Hidden below `sm` — see `tab-bar.tsx` for the phone.
 *
 * A 48px fixed rail costs 12% of a 390px screen and gives back nine unlabelled
 * glyphs, so on a phone it is replaced rather than shrunk.
 */
export function Rail({ stones, dayIndex }: { stones: Stone[]; dayIndex: number }) {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-y-0 left-0 z-20 hidden w-12 flex-col items-center border-r border-line bg-ink-900 py-3 sm:flex"
    >
      <Link href="/today" aria-label="Cairn — today" className="tap mb-4">
        <Mark />
      </Link>

      <ul className="flex min-h-0 flex-col items-center gap-1 overflow-y-auto">
        {NAV.map((n) => {
          const active = current === n.href;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                title={n.label}
                aria-label={n.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-[3px] text-base transition-colors duration-[120ms]",
                  active ? "bg-ink-800 text-phos" : "text-lo hover:bg-ink-850 hover:text-mid",
                )}
              >
                {active && (
                  <span className="absolute -left-[13px] h-4 w-[2px] rounded-r-[1px] bg-phos" />
                )}
                {n.glyph}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex w-full flex-col items-center gap-2 px-2.5">
        <Cairn stones={stones} max={18} />
        <span className="legend tabular-nums" title="active days">
          {String(dayIndex).padStart(2, "0")}
        </span>
      </div>
    </nav>
  );
}
