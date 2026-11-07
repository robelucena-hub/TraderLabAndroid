import { toPercent } from "./curve";

/**
 * Colour bands that translate a retention percentage into a visual signal.
 * Bands are inclusive on both ends and cover 0..100 without gaps.
 */
export type RetentionBandId = "fresh" | "stable" | "attention" | "weak" | "critical";

export interface RetentionBand {
  id: RetentionBandId;
  /** Lowest percentage in the band (inclusive). */
  min: number;
  /** Highest percentage in the band (inclusive). */
  max: number;
  /** Colour name, for non-visual consumers (API, screen readers). */
  color: "green" | "yellow-green" | "yellow" | "orange" | "red";
  /** Short pt-BR label shown on cards. */
  label: string;
  /** pt-BR colour name shown in the legend. */
  colorLabel: string;
  /** pt-BR guidance shown in the legend and on the topic page. */
  description: string;
}

/** Ordered from best to worst retention. */
export const RETENTION_BANDS: readonly RetentionBand[] = [
  {
    id: "fresh",
    min: 80,
    max: 100,
    color: "green",
    label: "Fresco",
    colorLabel: "Verde",
    description: "Conteúdo bem fixado. Nada a fazer por enquanto.",
  },
  {
    id: "stable",
    min: 60,
    max: 79,
    color: "yellow-green",
    label: "Estável",
    colorLabel: "Verde-amarelo",
    description: "Ainda firme, mas a curva já começou a cair.",
  },
  {
    id: "attention",
    min: 40,
    max: 59,
    color: "yellow",
    label: "Atenção",
    colorLabel: "Amarelo",
    description: "Ponto ideal para revisar: você ainda lembra boa parte.",
  },
  {
    id: "weak",
    min: 20,
    max: 39,
    color: "orange",
    label: "Enfraquecendo",
    colorLabel: "Laranja",
    description: "A memória está sumindo. Revise o quanto antes.",
  },
  {
    id: "critical",
    min: 0,
    max: 19,
    color: "red",
    label: "Crítico",
    colorLabel: "Vermelho",
    description: "Quase tudo esquecido. Revise agora!",
  },
] as const;

/** Band for a whole percentage (values outside 0..100 are clamped). */
export function bandForPercent(percent: number): RetentionBand {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const band = RETENTION_BANDS.find((b) => p >= b.min && p <= b.max);
  // The bands cover 0..100 completely, so this only fires if they are edited wrongly.
  if (!band) throw new Error(`No retention band covers ${p}%`);
  return band;
}

/** Band for a retention ratio (0..1). Uses the same rounding as the UI. */
export function bandForRetention(retention: number): RetentionBand {
  return bandForPercent(toPercent(retention));
}

export function isCritical(retention: number): boolean {
  return bandForRetention(retention).id === "critical";
}
