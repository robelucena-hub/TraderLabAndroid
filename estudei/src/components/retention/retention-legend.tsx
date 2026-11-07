import { RETENTION_BANDS } from "@/lib/forgetting-curve";
import { cn } from "@/lib/utils";
import { BAND_STYLES } from "./band-styles";

/** Explains what each colour means. */
export function RetentionLegend({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <ul className={cn("grid gap-2.5", className)} aria-label="Legenda das cores de retenção">
      {RETENTION_BANDS.map((band) => (
        <li key={band.id} className="flex items-start gap-3">
          <span className={cn("mt-1 size-3 shrink-0 rounded-full", BAND_STYLES[band.id].dot)} aria-hidden />
          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{band.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {band.colorLabel} · {band.min}–{band.max}%
              </span>
            </div>
            {!compact && <p className="text-muted-foreground">{band.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
