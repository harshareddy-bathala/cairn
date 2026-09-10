import { cn } from "@/lib/cn";

/** Three stacked stones — the app's mark, at the one size it is ever drawn. */
export function Mark({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col items-center gap-[2px]", className)} aria-hidden>
      <span className="h-[3px] w-3 rounded-[1px] bg-phos" />
      <span className="h-[3px] w-4 rounded-[1px] bg-phos-dim" />
      <span className="h-[3px] w-5 rounded-[1px] bg-phos-dim" />
    </span>
  );
}
