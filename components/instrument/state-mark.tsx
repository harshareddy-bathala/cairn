import { MARK, type MarkState } from "@/lib/marks";
import { cn } from "@/lib/cn";

/**
 * A ✓ ◐ ▢ glyph with the words it stands for. The glyph is hidden from screen
 * readers — "check mark" or "ballot box" says nothing useful — and `label` is
 * read in its place: "passed", "attempted", "not yet".
 */
export function StateMark({
  state,
  label,
  className,
}: {
  state: MarkState;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("w-4 shrink-0 text-center text-sm leading-none", MARK[state].cls, className)}>
      <span aria-hidden>{MARK[state].glyph}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
