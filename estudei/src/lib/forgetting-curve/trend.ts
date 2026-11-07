import { addDays, retentionAt } from "./curve";

/**
 * Overall retention trend.
 *
 * Each review row stores the memory strength right after it, so the retention
 * of a topic at ANY past instant can be replayed exactly: find the latest
 * review before that instant and apply R = e^(-t / S) from there.
 *
 * Future points use the very same rule. Since no review exists after "now",
 * they show what happens if you stop reviewing (a projection).
 */

export interface HistoryPoint {
  reviewedAt: Date;
  /** Memory strength S (days) right after this review. */
  strengthAfter: number;
}

/**
 * Retention (0..1) at instant `at`, given a topic's review history in any order.
 * Returns null when the topic had not been studied yet at that instant.
 */
export function retentionFromHistory(history: readonly HistoryPoint[], at: Date): number | null {
  let latest: HistoryPoint | null = null;
  for (const review of history) {
    if (review.reviewedAt.getTime() > at.getTime()) continue;
    if (!latest || review.reviewedAt.getTime() > latest.reviewedAt.getTime()) {
      latest = review;
    }
  }
  if (!latest) return null;
  return retentionAt({ lastReviewedAt: latest.reviewedAt, strength: latest.strengthAfter }, at);
}

export interface TrendPoint {
  /** Days relative to now (negative = past, 0 = now, positive = projection). */
  offsetDays: number;
  date: Date;
  /** Mean retention (0..1) of the topics that existed at that instant. */
  averageRetention: number | null;
  /** How many topics were part of the average. */
  topicCount: number;
  /** True for points after now (assumes no new reviews). */
  projected: boolean;
}

export interface TrendOptions {
  pastDays?: number;
  futureDays?: number;
}

/** Average retention across all topics, one point per day from -pastDays to +futureDays. */
export function averageRetentionTrend(
  histories: readonly (readonly HistoryPoint[])[],
  now: Date,
  { pastDays = 30, futureDays = 30 }: TrendOptions = {},
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let offset = -pastDays; offset <= futureDays; offset++) {
    const date = addDays(now, offset);
    let sum = 0;
    let count = 0;
    for (const history of histories) {
      const retention = retentionFromHistory(history, date);
      if (retention === null) continue;
      sum += retention;
      count++;
    }
    points.push({
      offsetDays: offset,
      date,
      averageRetention: count > 0 ? sum / count : null,
      topicCount: count,
      projected: offset > 0,
    });
  }
  return points;
}
