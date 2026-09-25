import { cn, merge } from "@/lib/cn";

/**
 * Text inputs, one look.
 *
 * The same class string lived in four constants and a dozen inline copies, and
 * every copy carried `focus:outline-none` — so the 2px focus ring the rest of
 * the app shows was switched off on exactly the controls where a keyboard user
 * most needs to see where they are. The ring is back; the border still brightens
 * on focus as well.
 *
 * Font size and min-height on phones come from globals.css, which targets the
 * elements directly so nothing here has to remember them.
 */
export const fieldClass =
  "w-full rounded-[3px] border border-line bg-ink-900 px-2.5 py-1.5 text-sm text-hi placeholder:text-lo focus:border-phos-dim";

export function Input({ className, ...rest }: React.ComponentProps<"input">) {
  return <input className={merge(fieldClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.ComponentProps<"textarea">) {
  return <textarea className={merge(`${fieldClass} leading-relaxed`, className)} {...rest} />;
}

export function Select({ className, ...rest }: React.ComponentProps<"select">) {
  return <select className={merge(fieldClass, className)} {...rest} />;
}

/** a field with its legend-voiced label above it */
export function Field({
  label,
  className,
  children,
}: {
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="legend">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
