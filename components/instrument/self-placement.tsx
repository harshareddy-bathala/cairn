"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bankUnits } from "@/app/actions/onboarding";
import { cn } from "@/lib/cn";

type Mod = {
  slug: string;
  title: string;
  trackSlug: string;
  units: { slug: string; title: string; objective: string }[];
};

/**
 * Self-placement.
 *
 * You are already weeks into this material — Bandit is cleared, Kadane's is
 * written, systemd services exist. Re-doing banked work is the fastest way to
 * abandon a roadmap, so tick what you could already explain to someone else and
 * the trail starts where you actually are.
 */
export function SelfPlacement({ modules }: { modules: Mod[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(modules[0]?.slug ?? null);
  const [saving, setSaving] = useState(false);

  const toggleUnit = (slug: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const toggleModule = (m: Mod) =>
    setPicked((s) => {
      const next = new Set(s);
      const all = m.units.every((u) => next.has(u.slug));
      for (const u of m.units) {
        if (all) next.delete(u.slug);
        else next.add(u.slug);
      }
      return next;
    });

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-line-soft border-t border-line-soft">
        {modules.map((m) => {
          const mine = m.units.filter((u) => picked.has(u.slug)).length;
          const isOpen = open === m.slug;
          return (
            <li key={m.slug}>
              <div className="flex items-baseline gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleModule(m)}
                  aria-label={`select all of ${m.title}`}
                  className={cn(
                    "w-4 shrink-0 text-center text-sm leading-none transition-colors duration-[120ms]",
                    mine === m.units.length ? "text-phos" : mine > 0 ? "text-warn" : "text-lo hover:text-mid",
                  )}
                >
                  {mine === m.units.length ? "✓" : mine > 0 ? "◐" : "▢"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : m.slug)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 truncate text-left text-sm text-hi transition-colors duration-[120ms] hover:text-phos"
                >
                  {m.title}
                </button>
                <span className="legend shrink-0 tabular-nums">
                  {mine}/{m.units.length}
                </span>
                <span className="w-4 shrink-0 text-center text-2xs text-lo">
                  {isOpen ? "▾" : "▸"}
                </span>
              </div>

              {isOpen && (
                <ul className="space-y-1 pb-3 pl-7">
                  {m.units.map((u) => (
                    <li key={u.slug}>
                      <button
                        type="button"
                        onClick={() => toggleUnit(u.slug)}
                        className="flex w-full items-baseline gap-2.5 py-1 text-left"
                      >
                        <span
                          className={cn(
                            "w-3 shrink-0 text-center text-2xs leading-none",
                            picked.has(u.slug) ? "text-phos" : "text-lo",
                          )}
                        >
                          {picked.has(u.slug) ? "✓" : "▢"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm",
                              picked.has(u.slug) ? "text-mid" : "text-hi",
                            )}
                          >
                            {u.title}
                          </span>
                          <span className="block text-2xs leading-relaxed text-lo">
                            {u.objective}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            startTransition(async () => {
              setSaving(true);
              await bankUnits([...picked]);
              router.push("/today");
              router.refresh();
            })
          }
          className="rounded-[3px] border border-line px-4 py-1.5 text-sm text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos"
        >
          {picked.size === 0 ? "start from the beginning" : `bank ${picked.size} and start`}
        </button>
        <span className="text-2xs leading-relaxed text-lo">
          Banked units count toward the map and the phase exam, but they put no stone on
          the cairn — you did not earn them here.
        </span>
      </div>
    </div>
  );
}
