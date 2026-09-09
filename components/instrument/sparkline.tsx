import { cn } from "@/lib/cn";

const STROKE = {
  neutral: "stroke-mid",
  ok: "stroke-phos",
  warn: "stroke-warn",
  bad: "stroke-bad",
  info: "stroke-info",
} as const;

/**
 * A trend line.
 *
 * Pass `label` whenever the shape is the only place a number appears. Without
 * one the svg stays `aria-hidden`, which is correct only when the same figure is
 * already written out beside it.
 */
export function Sparkline({
  data,
  tone = "neutral",
  width = 56,
  height = 14,
  className,
  label,
}: {
  data: number[];
  tone?: keyof typeof STROKE;
  width?: number;
  height?: number;
  className?: string;
  label?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 1.5;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={STROKE[tone]}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={pts[pts.length - 1].split(",")[0]}
        cy={pts[pts.length - 1].split(",")[1]}
        r={1.4}
        className={cn(STROKE[tone], "fill-current")}
      />
    </svg>
  );
}
