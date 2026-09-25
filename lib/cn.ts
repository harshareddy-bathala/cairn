export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * The property groups a component's base classes may be overridden in. Only
 * these: `cn` is a plain join, and two utilities for the same property are
 * decided by where Tailwind emits them in the stylesheet, not by the order
 * they are written — so `text-mid` in a base and `text-hi` from a caller is a
 * coin toss unless the base one is removed.
 */
const GROUPS: [string, RegExp][] = [
  ["px", /^px-/],
  ["py", /^py-/],
  ["pt", /^pt-/],
  ["pb", /^pb-/],
  ["mt", /^mt-/],
  ["w", /^w-/],
  ["min-h", /^min-h-/],
  ["text-size", /^text-(2xs|xs|sm|base|lg|xl|2xl|3xl)$/],
  ["text-color", /^text-(hi|mid|lo|phos|phos-dim|bad|warn|info)$/],
  ["border-color", /^border-(line|line-soft|line-hi|phos|phos-dim|bad|warn|info)$/],
];

/** the group a class overrides, keyed by its variant prefix (`hover:`, `sm:`) */
function group(cls: string) {
  const i = cls.lastIndexOf(":");
  const bare = cls.slice(i + 1);
  const g = GROUPS.find(([, re]) => re.test(bare));
  return g ? cls.slice(0, i + 1) + g[0] : null;
}

/**
 * `base` with `extra` layered on top: a class in `extra` removes any class in
 * `base` that sets the same property under the same variant. For components
 * that take a `className` meant to adjust their defaults.
 */
export function merge(base: string, extra?: string | false | null) {
  if (!extra) return base;
  const taken = new Set(extra.split(/\s+/).map(group).filter(Boolean));
  const kept = base.split(/\s+/).filter((c) => {
    const g = group(c);
    return !g || !taken.has(g);
  });
  return [...kept, extra].join(" ");
}
