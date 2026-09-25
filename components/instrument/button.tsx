import { cn, merge } from "@/lib/cn";

/**
 * The bordered button, in the four voices the app uses.
 *
 * These were twenty hand-written class strings that had drifted: some faded to
 * 40% when disabled and some to 50%, some kept their hover colour while
 * disabled (so a dead button still lit up under the mouse), and one set
 * `disabled:hover:*` by hand to undo that. A disabled button here ignores the
 * pointer entirely, so it has no hover to undo — and the same classes work on
 * a link, where `:enabled` never matches.
 *
 *  - ghost    the default — most actions
 *  - primary  the one action a panel exists for (submit the quiz, close the day)
 *  - danger   sign out, reset, unlink — neutral until you aim at it
 *  - quiet    the way back out of a confirm (cancel)
 *
 * `pending` disables the button and marks it busy, so a slow server action
 * cannot be sent twice and a screen reader hears that something is happening.
 * `buttonClass` is exported for a link that has to look like a button.
 */
export type ButtonVariant = "ghost" | "primary" | "danger" | "quiet";
export type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  ghost: "border-line text-mid hover:border-phos hover:text-phos",
  primary: "border-phos text-phos hover:bg-phos/10",
  danger: "border-line text-mid hover:border-bad hover:text-bad",
  quiet: "border-line text-mid hover:text-hi",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function buttonClass(variant: ButtonVariant = "ghost", size: ButtonSize = "sm", className?: string) {
  return merge(
    cn(
      "ctl inline-flex items-center justify-center gap-2 rounded-[3px] border transition-colors duration-[120ms]",
      "disabled:pointer-events-none disabled:opacity-50",
      VARIANT[variant],
      SIZE[size],
    ),
    className,
  );
}

export function Button({
  variant = "ghost",
  size = "sm",
  pending = false,
  type = "button",
  className,
  disabled,
  children,
  ...rest
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** a server action is in flight: disabled and announced as busy */
  pending?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
