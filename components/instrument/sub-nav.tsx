"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SubNavItem } from "@/lib/routes";
import { cn } from "@/lib/cn";

/**
 * A section's own pages, as one segmented row.
 *
 * The top-level nav names five places; the pages inside Progress and Desk are
 * reached from here. Matching is exact rather than by prefix — the section's
 * first page is also the prefix of every other one, so a prefix match would
 * light it up everywhere.
 */
export function SubNav({ label, items }: { label: string; items: SubNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8">
      <ul className="flex gap-1 overflow-x-auto border-b border-line-soft">
        {items.map((i) => {
          const active = pathname === i.href;
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative block px-3 py-2.5 text-sm transition-colors duration-[120ms]",
                  active ? "text-hi" : "text-lo hover:text-mid",
                )}
              >
                {i.label}
                {/* the rail's marker, laid along the edge the row sits on */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-[2px] rounded-t-[1px] bg-phos"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
