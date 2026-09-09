import { cn } from "@/lib/cn";
import { Sparkline } from "./sparkline";

type Tone = "neutral" | "ok" | "warn" | "bad" | "info";

const TONE: Record<Tone, string> = {
  neutral: "text-hi",
  ok: "text-phos",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
};

/** label / value / delta triple. Every numeral here is tabular mono. */
export function Readout({
  label,
  value,
  unit,
  note,
  tone = "neutral",
  series,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  note?: string;
  tone?: Tone;
  series?: number[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <span className="legend shrink-0">{label}</span>
      <span className="flex min-w-0 items-baseline gap-2">
        {series && series.length > 1 && (
          <Sparkline data={series} tone={tone} className="mb-px self-center" />
        )}
        <span className={cn("text-sm tabular-nums", TONE[tone])}>
          {value}
          {unit && <span className="ml-0.5 text-2xs text-lo">{unit}</span>}
        </span>
        {note && <span className="truncate text-2xs text-lo">{note}</span>}
      </span>
    </div>
  );
}
