import type { RetentionBand } from "@/lib/forgetting-curve";
import { cn } from "@/lib/utils";
import { BAND_STYLES } from "./band-styles";

/** Band name with a coloured dot. Text stays in the normal ink colour for legibility. */
export function BandBadge({ band, className }: { band: RetentionBand; className?: string }) {
  const styles = BAND_STYLES[band.id];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-foreground",
        styles.soft,
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", styles.dot)} aria-hidden />
      {band.label}
    </span>
  );
}
