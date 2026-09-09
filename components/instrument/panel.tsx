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
        "relative rounded-[--radius-panel] border border-line bg-ink-850/60",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-line-hi",
        active &&
          "border-phos-dim/50 shadow-[0_0_0_1px_var(--color-phos-dim)/20,0_0_40px_-12px_var(--color-phos)]",
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
