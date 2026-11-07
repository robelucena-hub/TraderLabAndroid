import { BAND_STYLES } from "@/components/retention/band-styles";
import {
  BASE_STRENGTH_DAYS,
  RETENTION_BANDS,
  memoryStrength,
  retentionAfter,
  stateAfterSession,
} from "@/lib/forgetting-curve";

const WIDTH = 560;
const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 12 };
const DAYS = 40;

const x = (day: number) => PAD.left + (day / DAYS) * (WIDTH - PAD.left - PAD.right);
const y = (retention: number) => PAD.top + (1 - retention) * (HEIGHT - PAD.top - PAD.bottom);

/**
 * Illustration for the landing page, computed with the real engine: one topic
 * reviewed on every suggested date (sawtooth that flattens out) versus the
 * same topic never reviewed again.
 */
export function CurveIllustration() {
  // Review days following the ladder: 0, 1, 4, 11, 26.
  const reviewDays: number[] = [0];
  for (let n = 1; reviewDays.at(-1)! + stateAfterSession(new Date(0), n).intervalDays <= DAYS; n++) {
    reviewDays.push(reviewDays.at(-1)! + stateAfterSession(new Date(0), n).intervalDays);
  }

  const reviewedPath: string[] = [];
  for (let step = 0; step <= DAYS * 10; step++) {
    const day = step / 10;
    const sessionIndex = reviewDays.filter((d) => d <= day).length; // 1-based session number
    const lastReview = reviewDays[sessionIndex - 1];
    const r = retentionAfter(day - lastReview, memoryStrength(sessionIndex));
    reviewedPath.push(`${step === 0 ? "M" : "L"}${x(day).toFixed(1)},${y(r).toFixed(1)}`);
  }

  const neverPath = Array.from({ length: DAYS * 10 + 1 }, (_, step) => {
    const day = step / 10;
    return `${step === 0 ? "M" : "L"}${x(day).toFixed(1)},${y(retentionAfter(day, BASE_STRENGTH_DAYS)).toFixed(1)}`;
  }).join("");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label="Ilustração: sem revisões, a retenção cai para perto de zero em poucos dias; com revisões nos dias 1, 4, 11 e 26, a curva cai cada vez mais devagar."
    >
      {RETENTION_BANDS.map((band) => (
        <rect
          key={band.id}
          x={PAD.left}
          width={WIDTH - PAD.left - PAD.right}
          y={y((band.max + (band.max === 100 ? 0 : 1)) / 100)}
          height={y(band.min / 100) - y((band.max + (band.max === 100 ? 0 : 1)) / 100)}
          fill={BAND_STYLES[band.id].color}
          opacity={0.1}
        />
      ))}
      <path d={neverPath} fill="none" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" />
      <path d={reviewedPath.join("")} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" />
      {reviewDays.slice(1).map((day) => (
        <g key={day}>
          <circle cx={x(day)} cy={y(1)} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
          <text x={x(day)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
            dia {day}
          </text>
        </g>
      ))}
      <text x={x(0) + 4} y={HEIGHT - 8} fontSize={11} fill="var(--muted-foreground)">
        estudo
      </text>
    </svg>
  );
}
