"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cairn, type Stone } from "./cairn";
import { Mark } from "./mark";
import { NAV, activeHref } from "@/lib/nav";
import { AccountMenu, type AccountInfo } from "./account";
import { cn } from "@/lib/cn";
import { fmtDay } from "@/lib/format";

/**
 * The desktop rail. Hidden below `sm` — see `tab-bar.tsx` for the phone.
 *
 * A 48px fixed rail costs 12% of a 390px screen and gives back five unlabelled
 * glyphs, so on a phone it is replaced rather than shrunk.
 *
 * Between `sm` and `lg` it stays a 48px column of glyphs, each with a label
 * that appears on hover *and* on keyboard focus — `title` only ever served the
 * mouse. From `lg` there is room to spare beside a 768px page, so the labels
 * are simply written out: glyphs alone are a memory test on a desktop too.
 */
export function Rail({
  stones,
  dayIndex,
  account,
}: {
  stones: Stone[];
  dayIndex: number;
  account: AccountInfo;
}) {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-y-0 left-0 z-20 hidden w-12 flex-col border-r border-line bg-ink-900 py-3 sm:flex lg:w-52"
    >
      <Link
        href="/today"
        aria-label="Cairn — today"
        className="tap mb-4 flex items-center gap-3 self-center lg:self-stretch lg:px-4"
      >
        <Mark />
        <span className="hidden text-sm tracking-[0.02em] text-hi lg:inline">Cairn</span>
      </Link>

      <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto px-1.5 lg:px-2.5">
        {NAV.map((n) => {
          const active = current === n.href;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-label={n.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 w-9 items-center justify-center gap-3 rounded-[3px] transition-colors duration-[120ms]",
                  "lg:w-full lg:justify-start lg:px-2.5",
                  active ? "bg-ink-800 text-phos" : "text-lo hover:bg-ink-850 hover:text-mid",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute -left-1.5 h-4 w-[2px] rounded-r-[1px] bg-phos lg:-left-2.5"
                  />
                )}
                <span aria-hidden className="w-4 text-center text-base leading-none">
                  {n.glyph}
                </span>
                <span aria-hidden className={cn("hidden text-sm lg:inline", active ? "text-hi" : "")}>
                  {n.label}
                </span>
                {/* the label, for the glyph-only width — shown on hover and on focus */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute left-[calc(100%+10px)] z-30 whitespace-nowrap rounded-[3px] border border-line bg-ink-850 px-2 py-1 text-xs text-hi",
                    "opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100 lg:hidden",
                  )}
                >
                  {n.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex w-full flex-col items-center gap-2 px-2.5 lg:gap-3 lg:px-4">
        <div className="flex w-full flex-col items-center gap-2 lg:flex-row lg:items-end lg:gap-3">
          <div className="w-full lg:w-10 lg:shrink-0">
            <Cairn stones={stones} max={18} />
          </div>
          {/* today's day number and the closed days are different counts —
              the open day has no stone yet — so they are labelled apart */}
          <span className="legend text-center tabular-nums">
            <span className="lg:hidden">{fmtDay(dayIndex, true)}</span>
            <span className="hidden lg:inline">
              {fmtDay(dayIndex)}
              <span className="block text-lo">{stones.length} closed</span>
            </span>
          </span>
        </div>
        <AccountMenu account={account} />
      </div>
    </nav>
  );
}
