"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cairn, type Stone } from "./cairn";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/today", glyph: "▣", label: "Today" },
  { href: "/roadmap", glyph: "◇", label: "Trail" },
  { href: "/metrics", glyph: "◎", label: "Metrics" },
  { href: "/projects", glyph: "✦", label: "Projects" },
  { href: "/career", glyph: "▧", label: "Career" },
  { href: "/review", glyph: "▤", label: "Review" },
  { href: "/cohort", glyph: "◰", label: "Cohort" },
  { href: "/settings", glyph: "⌗", label: "Settings" },
];

export function Rail({ stones, dayIndex }: { stones: Stone[]; dayIndex: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-20 flex w-12 flex-col items-center border-r border-line bg-ink-900 py-3">
      <Link href="/today" aria-label="Cairn" className="mb-4 flex flex-col items-center gap-[2px]">
        <span className="h-[3px] w-3 rounded-[1px] bg-phos" />
        <span className="h-[3px] w-4 rounded-[1px] bg-phos-dim" />
        <span className="h-[3px] w-5 rounded-[1px] bg-phos-dim" />
      </Link>

      <ul className="flex flex-col items-center gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
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
