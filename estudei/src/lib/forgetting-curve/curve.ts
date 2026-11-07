/**
 * Ebbinghaus forgetting curve + spaced-repetition ladder.
 *
 * The model
 * ---------
 *
 *     R(t) = e^(-t / S)
 *
 *   R  retention: the estimated chance (0..1) that you still remember the topic.
 *   t  time elapsed since the last review, in days (fractional: 12h = 0.5).
 *   S  memory strength, in days. It is the time it takes R to fall to
 *      1/e ≈ 36.8%. A larger S means a flatter curve (slower forgetting).
 *
 * Every successful review makes the memory stronger, so S grows with the
 * number of reviews. We tie S to the review ladder (1, 3, 7, 15, 30 days):
 *
 *     S(n) = BASE_STRENGTH_DAYS × interval(n)
 *
 * with BASE_STRENGTH_DAYS = 1 / ln(2) ≈ 1.44 days. Plugging t = interval(n)
 * into R(t) gives e^(-ln 2) = 0.5, so **every topic reaches exactly 50%
 * retention on the day its next review is due**, whatever the review number.
 * That keeps the colours on screen and the suggested dates in agreement.
 *
 * (A linear rule such as S = base × reviewCount cannot keep up with an
 * interval ladder that roughly doubles each step: by the 5th review the card
 * would turn red about two weeks before the review was even due.)
 *
 * Everything in this file is pure (no I/O, no clock access) so it can be used
 * on the server, in the browser, in scripts and in unit tests.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days to wait before the next review after the n-th study session
 * (n = 1 is the first time you studied the topic). After the last step the
 * interval stays at the final value.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 15, 30] as const;

/** Retention we expect a topic to have at the moment its review is due. */
export const TARGET_RETENTION_AT_DUE = 0.5;

/**
 * Strength (days) of a memory after the first study session.
 * Solves e^(-interval(1) / S) = TARGET_RETENTION_AT_DUE for interval(1) = 1 day:
 *   S = 1 / ln(1 / 0.5) = 1 / ln 2 ≈ 1.4427 days.
 */
export const BASE_STRENGTH_DAYS = 1 / Math.log(1 / TARGET_RETENTION_AT_DUE);

export type ReviewOutcome = "REMEMBERED" | "FORGOT";

/** Minimal information needed to compute a topic's retention. */
export interface DecayInput {
  lastReviewedAt: Date;
  /** Memory strength S, in days. */
  strength: number;
}

/** Full spaced-repetition state of a topic right after a review. */
export interface MemoryState extends DecayInput {
  /** Study sessions so far, counting the first one (always >= 1). */
  reviewCount: number;
  nextReviewAt: Date;
  /** Days between lastReviewedAt and nextReviewAt. */
  intervalDays: number;
}

function assertReviewCount(reviewCount: number): void {
  if (!Number.isInteger(reviewCount) || reviewCount < 1) {
    throw new RangeError(`reviewCount must be an integer >= 1 (got ${reviewCount})`);
  }
}

/** Days until the next review after the given session number (1-based). */
export function intervalForReview(reviewCount: number): number {
  assertReviewCount(reviewCount);
  const index = Math.min(reviewCount, REVIEW_INTERVALS_DAYS.length) - 1;
  return REVIEW_INTERVALS_DAYS[index];
}

/** Memory strength S (days) after the given number of study sessions. */
export function memoryStrength(reviewCount: number): number {
  return BASE_STRENGTH_DAYS * intervalForReview(reviewCount);
}

/**
 * The forgetting curve itself: R = e^(-t / S).
 * Negative elapsed time (a review date slightly in the future because of
 * clock skew) is treated as "just reviewed", i.e. R = 1.
 */
export function retentionAfter(elapsedDays: number, strengthDays: number): number {
  if (!(strengthDays > 0)) {
    throw new RangeError(`strength must be > 0 (got ${strengthDays})`);
  }
  const t = Math.max(0, elapsedDays);
  return Math.exp(-t / strengthDays);
}

/** Fractional days between two instants (positive when `to` is later). */
export function elapsedDays(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

/** Current retention (0..1) of a topic at instant `now`. */
export function retentionAt(topic: DecayInput, now: Date): number {
  return retentionAfter(elapsedDays(topic.lastReviewedAt, now), topic.strength);
}

/**
 * Retention as a whole percentage (0..100). Colour bands are derived from this
 * rounded value so the number on screen and the colour always agree.
 */
export function toPercent(retention: number): number {
  const clamped = Math.min(1, Math.max(0, retention));
  return Math.round(clamped * 100);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Builds the state of a topic right after its `reviewCount`-th session. */
export function stateAfterSession(reviewedAt: Date, reviewCount: number): MemoryState {
  const intervalDays = intervalForReview(reviewCount);
  return {
    reviewCount,
    lastReviewedAt: reviewedAt,
    strength: memoryStrength(reviewCount),
    intervalDays,
    nextReviewAt: addDays(reviewedAt, intervalDays),
  };
}

/** Result of logging a review: the new state plus what retention was before it. */
export interface ReviewResult extends MemoryState {
  /** Retention (0..1) right before this review happened. */
  retentionBefore: number;
}

/**
 * Applies a review to a topic.
 *  - REMEMBERED: one more successful session, so S moves up one step.
 *  - FORGOT: the memory restarts from the first step (S = BASE_STRENGTH_DAYS).
 * In both cases the decay resets: t starts again from zero at `reviewedAt`.
 */
export function applyReview(
  current: Pick<MemoryState, "reviewCount" | "lastReviewedAt" | "strength">,
  outcome: ReviewOutcome,
  reviewedAt: Date,
): ReviewResult {
  assertReviewCount(current.reviewCount);
  const retentionBefore = retentionAt(current, reviewedAt);
  const nextCount = outcome === "REMEMBERED" ? current.reviewCount + 1 : 1;
  return { ...stateAfterSession(reviewedAt, nextCount), retentionBefore };
}

export interface CurvePoint {
  /** Days from `from` (0 = now). */
  day: number;
  date: Date;
  /** Retention, 0..1. */
  retention: number;
}

/**
 * Samples the forgetting curve from `from` over the next `days` days,
 * assuming no new review happens. Used by the per-topic chart.
 */
export function projectRetention(
  topic: DecayInput,
  from: Date,
  days = 30,
  samplesPerDay = 1,
): CurvePoint[] {
  if (!(days > 0) || !Number.isInteger(samplesPerDay) || samplesPerDay < 1) {
    throw new RangeError("days must be > 0 and samplesPerDay an integer >= 1");
  }
  const points: CurvePoint[] = [];
  const steps = Math.round(days * samplesPerDay);
  for (let i = 0; i <= steps; i++) {
    const day = i / samplesPerDay;
    const date = addDays(from, day);
    points.push({ day, date, retention: retentionAt(topic, date) });
  }
  return points;
}

/**
 * Inverse of the curve: how many days after the last review retention
 * drops to `targetRetention`.  t = -S × ln(R)
 */
export function daysUntilRetention(strengthDays: number, targetRetention: number): number {
  if (!(targetRetention > 0 && targetRetention <= 1)) {
    throw new RangeError("targetRetention must be in (0, 1]");
  }
  return -strengthDays * Math.log(targetRetention);
}
