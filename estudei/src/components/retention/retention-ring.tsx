import { bandForPercent } from "@/lib/forgetting-curve";
import { cn } from "@/lib/utils";
import { BAND_STYLES } from "./band-styles";

interface RetentionRingProps {
  /** Retention percentage, 0..100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Extra line under the number (e.g. "retenção"). */
  caption?: string;
}

/**
 * Circular progress ring. The arc length and colour show the retention; the
 * number in the middle uses regular text colour so it is always readable.
 */
export function RetentionRing({ percent, size = 64, strokeWidth = 6, className, caption }: RetentionRingProps) {
  const band = bandForPercent(percent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      role="img"
      aria-label={`Retenção de ${clamped}% (${band.label})`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={BAND_STYLES[band.id].color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-semibold" style={{ fontSize: Math.max(12, size * 0.24) }}>
          {clamped}%
        </span>
        {caption && <span className="mt-1 text-[10px] text-muted-foreground">{caption}</span>}
      </div>
    </div>
  );
}
