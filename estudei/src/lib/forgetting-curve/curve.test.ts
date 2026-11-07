import { describe, expect, it } from "vitest";
import {
  BASE_STRENGTH_DAYS,
  MS_PER_DAY,
  REVIEW_INTERVALS_DAYS,
  TARGET_RETENTION_AT_DUE,
  addDays,
  applyReview,
  daysUntilRetention,
  elapsedDays,
  intervalForReview,
  memoryStrength,
  projectRetention,
  retentionAfter,
  retentionAt,
  stateAfterSession,
  toPercent,
} from "./curve";

const T0 = new Date("2026-03-01T12:00:00.000Z");

describe("retentionAfter (R = e^(-t/S))", () => {
  it("is 100% right after a review", () => {
    expect(retentionAfter(0, 5)).toBe(1);
  });

  it("falls to 1/e after S days", () => {
    expect(retentionAfter(5, 5)).toBeCloseTo(Math.exp(-1), 10);
  });

  it("matches the formula for arbitrary values", () => {
    expect(retentionAfter(2.5, 4)).toBeCloseTo(Math.exp(-2.5 / 4), 12);
  });

  it("decreases monotonically over time", () => {
    const values = [0, 0.5, 1, 2, 5, 10, 30].map((t) => retentionAfter(t, 3));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThan(values[i - 1]);
    }
  });

  it("decays more slowly when memory is stronger", () => {
    expect(retentionAfter(3, 10)).toBeGreaterThan(retentionAfter(3, 2));
  });

  it("treats negative elapsed time (clock skew) as just reviewed", () => {
    expect(retentionAfter(-1, 3)).toBe(1);
  });

  it("rejects a non-positive strength", () => {
    expect(() => retentionAfter(1, 0)).toThrow(RangeError);
    expect(() => retentionAfter(1, -2)).toThrow(RangeError);
    expect(() => retentionAfter(1, Number.NaN)).toThrow(RangeError);
  });
});

describe("review ladder and memory strength", () => {
  it("follows the 1, 3, 7, 15, 30 day ladder and then stays at 30", () => {
    expect([1, 2, 3, 4, 5, 6, 12].map(intervalForReview)).toEqual([1, 3, 7, 15, 30, 30, 30]);
  });

  it("rejects invalid review counts", () => {
    expect(() => intervalForReview(0)).toThrow(RangeError);
    expect(() => intervalForReview(1.5)).toThrow(RangeError);
  });

  it("uses a base strength of 1/ln(2) days", () => {
    expect(BASE_STRENGTH_DAYS).toBeCloseTo(1 / Math.LN2, 12);
    expect(memoryStrength(1)).toBeCloseTo(BASE_STRENGTH_DAYS, 12);
  });

  it("grows strength with every review", () => {
    const strengths = [1, 2, 3, 4, 5].map(memoryStrength);
    for (let i = 1; i < strengths.length; i++) {
      expect(strengths[i]).toBeGreaterThan(strengths[i - 1]);
    }
  });

  it("puts every topic at exactly 50% retention on its due date", () => {
    for (let n = 1; n <= REVIEW_INTERVALS_DAYS.length + 2; n++) {
      const r = retentionAfter(intervalForReview(n), memoryStrength(n));
      expect(r).toBeCloseTo(TARGET_RETENTION_AT_DUE, 12);
    }
  });
});

describe("retentionAt / elapsedDays", () => {
  it("measures fractional days", () => {
    expect(elapsedDays(T0, new Date(T0.getTime() + MS_PER_DAY / 2))).toBe(0.5);
  });

  it("computes retention from the last review date", () => {
    const topic = { lastReviewedAt: T0, strength: 2 };
    expect(retentionAt(topic, addDays(T0, 1))).toBeCloseTo(Math.exp(-0.5), 12);
  });
});

describe("toPercent", () => {
  it("rounds to a whole percentage", () => {
    expect(toPercent(0.796)).toBe(80);
    expect(toPercent(0.794)).toBe(79);
  });

  it("clamps to 0..100", () => {
    expect(toPercent(1.2)).toBe(100);
    expect(toPercent(-0.1)).toBe(0);
  });
});

describe("stateAfterSession", () => {
  it("schedules the next review one interval later", () => {
    const state = stateAfterSession(T0, 3);
    expect(state.reviewCount).toBe(3);
    expect(state.intervalDays).toBe(7);
    expect(state.strength).toBeCloseTo(memoryStrength(3), 12);
    expect(state.nextReviewAt.toISOString()).toBe("2026-03-08T12:00:00.000Z");
  });
});

describe("applyReview", () => {
  const studied = stateAfterSession(T0, 1);

  it("moves one step up the ladder when remembered", () => {
    const reviewedAt = addDays(T0, 1);
    const result = applyReview(studied, "REMEMBERED", reviewedAt);
    expect(result.reviewCount).toBe(2);
    expect(result.intervalDays).toBe(3);
    expect(result.lastReviewedAt).toEqual(reviewedAt);
    expect(result.nextReviewAt).toEqual(addDays(reviewedAt, 3));
    expect(result.strength).toBeGreaterThan(studied.strength);
  });

  it("reports the retention right before the review", () => {
    const result = applyReview(studied, "REMEMBERED", addDays(T0, 1));
    expect(result.retentionBefore).toBeCloseTo(0.5, 12);
  });

  it("resets the decay: retention is 100% right after reviewing", () => {
    const reviewedAt = addDays(T0, 4);
    const result = applyReview(studied, "REMEMBERED", reviewedAt);
    expect(retentionAt(result, reviewedAt)).toBe(1);
  });

  it("restarts from the first step when the content was forgotten", () => {
    const strong = stateAfterSession(T0, 5);
    const result = applyReview(strong, "FORGOT", addDays(T0, 40));
    expect(result.reviewCount).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.strength).toBeCloseTo(BASE_STRENGTH_DAYS, 12);
  });
});

describe("projectRetention", () => {
  const topic = { lastReviewedAt: T0, strength: memoryStrength(2) };

  it("returns one point per day including day 0", () => {
    const points = projectRetention(topic, T0, 30);
    expect(points).toHaveLength(31);
    expect(points[0]).toMatchObject({ day: 0, retention: 1 });
    expect(points[30].day).toBe(30);
  });

  it("supports several samples per day", () => {
    const points = projectRetention(topic, T0, 2, 4);
    expect(points).toHaveLength(9);
    expect(points[1].day).toBe(0.25);
  });

  it("starts from the current retention when projected from later", () => {
    const from = addDays(T0, 3);
    const [first] = projectRetention(topic, from, 5);
    expect(first.retention).toBeCloseTo(retentionAt(topic, from), 12);
  });

  it("rejects invalid ranges", () => {
    expect(() => projectRetention(topic, T0, 0)).toThrow(RangeError);
    expect(() => projectRetention(topic, T0, 5, 0)).toThrow(RangeError);
  });
});

describe("daysUntilRetention", () => {
  it("is the inverse of the curve", () => {
    const s = 6;
    const t = daysUntilRetention(s, 0.3);
    expect(retentionAfter(t, s)).toBeCloseTo(0.3, 12);
  });

  it("rejects targets outside (0, 1]", () => {
    expect(() => daysUntilRetention(3, 0)).toThrow(RangeError);
    expect(() => daysUntilRetention(3, 1.5)).toThrow(RangeError);
  });
});
