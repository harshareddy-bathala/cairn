import { cn } from "@/lib/cn";

/**
 * The one container in the app. A hairline schematic block with its legend
 * notched into the top border. Never a shadowed card.
 */
export function Panel({
  legend,
  aux,
  children,
  className,
  active = false,
  flush = false,
}: {
  legend?: string;
  aux?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** raises the panel with a soft phosphor glow — for the block you're working */
  active?: boolean;
  /** drop inner padding, for tables and lists that manage their own */
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        // `rounded-panel`, not `rounded-[--radius-panel]`: Tailwind 4 no longer
        // wraps a bare custom property in var(), so the old class compiled to
        // `border-radius: --radius-panel` and every panel was square
        "relative rounded-panel border border-line bg-ink-850/60",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-panel before:bg-line-hi",
        // the glow used `var(--x)/20` inside the shadow, which is not a colour,
        // so the whole declaration was dropped and "active" never glowed
        active &&
          "border-phos-dim/50 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-phos-dim)_20%,transparent),0_0_40px_-12px_color-mix(in_oklab,var(--color-phos)_60%,transparent)]",
        className,
      )}
    >
      {(legend || aux) && (
        <header className="absolute -top-[7px] left-3 right-3 flex items-center justify-between gap-3">
          {legend ? (
            <span className="legend bg-ink-900 px-1.5 leading-none">{legend}</span>
          ) : (
            <span />
          )}
          {aux ? <span className="legend bg-ink-900 px-1.5 leading-none">{aux}</span> : null}
        </header>
      )}
      <div className={flush ? "" : "p-4 pt-5"}>{children}</div>
    </section>
  );
}
