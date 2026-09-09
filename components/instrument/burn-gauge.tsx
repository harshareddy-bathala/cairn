import { cn } from "@/lib/cn";

/**
 * Velocity as an SLO burn-down rather than a progress bar — the language
 * this app's user is training in. Never shows a due date.
 */
export function BurnGauge({
  remaining,
  label = "pace budget",
  className,
}: {
  /** 0..1 of the pace budget still unspent */
  remaining: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, remaining));
  const tone = pct > 0.5 ? "bg-phos" : pct > 0.2 ? "bg-warn" : "bg-bad";
  const text = pct > 0.5 ? "text-phos" : pct > 0.2 ? "text-warn" : "text-bad";
  const ticks = 24;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="legend">{label}</span>
        <span className={cn("text-sm tabular-nums", text)}>
          {(pct * 100).toFixed(1)}
          <span className="ml-0.5 text-2xs text-lo">%</span>
        </span>
      </div>
      <div className="flex gap-[2px]" aria-hidden>
        {Array.from({ length: ticks }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-[1px] transition-colors duration-200",
              i / ticks < pct ? tone : "bg-ink-800",
            )}
          />
        ))}
      </div>
    </div>
  );
}
