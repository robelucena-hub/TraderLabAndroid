import type { RetentionBandId } from "@/lib/forgetting-curve";

/**
 * Static Tailwind classes / CSS colours per band. Kept as literal strings so
 * Tailwind can find them at build time.
 */
export const BAND_STYLES: Record<RetentionBandId, { color: string; dot: string; soft: string }> = {
  fresh: { color: "var(--band-fresh)", dot: "bg-band-fresh", soft: "bg-band-fresh/12" },
  stable: { color: "var(--band-stable)", dot: "bg-band-stable", soft: "bg-band-stable/15" },
  attention: { color: "var(--band-attention)", dot: "bg-band-attention", soft: "bg-band-attention/18" },
  weak: { color: "var(--band-weak)", dot: "bg-band-weak", soft: "bg-band-weak/15" },
  critical: { color: "var(--band-critical)", dot: "bg-band-critical", soft: "bg-band-critical/12" },
};
