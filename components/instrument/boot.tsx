import { cn } from "@/lib/cn";

/**
 * Moment 1 — the instrument powering on. Panels fade up, rows stagger 40ms,
 * once per navigation, under 450ms total.
 *
 * This is CSS rather than motion, and the reason is not bundle size.
 *
 * The motion version rendered `initial={{ opacity: 0 }}`, which means the
 * server sent every page with its whole body at `opacity: 0` and JavaScript was
 * what made the content appear. Any failure between those two points — a
 * blocked script, a dead CDN, a hydration error, a browser extension, a slow
 * phone on a train — left a completely blank page. Not degraded: blank. That is
 * the wrong failure mode for the surface someone opens every morning, and it is
 * the one thing in a "reads like a tool an SRE built" design that an SRE would
 * actually object to.
 *
 * A CSS animation cannot fail that way. If it runs, you get the fade; if the
 * browser ignores it, you get the content immediately. `prefers-reduced-motion`
 * is already handled globally, and `both` fill means a zeroed duration lands on
 * the final frame rather than the first.
 *
 * These are also server components now, so a page of static panels ships no
 * client JavaScript for its own layout.
 */
export function Boot({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("boot", className)}>{children}</div>;
}

export function BootItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
