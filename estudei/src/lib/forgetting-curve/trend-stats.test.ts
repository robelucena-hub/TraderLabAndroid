import { describe, expect, it } from "vitest";
import { addDays, memoryStrength, retentionAfter, stateAfterSession } from "./curve";
import { sortByUrgency, summarize } from "./stats";
import { averageRetentionTrend, retentionFromHistory } from "./trend";

const NOW = new Date("2026-03-10T15:00:00Z");
const SP = "America/Sao_Paulo";

describe("retentionFromHistory", () => {
  const history = [
    { reviewedAt: addDays(NOW, -10), strengthAfter: memoryStrength(1) },
    { reviewedAt: addDays(NOW, -9), strengthAfter: memoryStrength(2) },
  ];

  it("is null before the topic was first studied", () => {
    expect(retentionFromHistory(history, addDays(NOW, -11))).toBeNull();
  });

  it("uses the latest review before the instant", () => {
    expect(retentionFromHistory(history, addDays(NOW, -9.5))).toBeCloseTo(
      retentionAfter(0.5, memoryStrength(1)),
      12,
    );
    expect(retentionFromHistory(history, NOW)).toBeCloseTo(retentionAfter(9, memoryStrength(2)), 12);
  });

  it("does not depend on the order of the history", () => {
    expect(retentionFromHistory([...history].reverse(), NOW)).toBe(retentionFromHistory(history, NOW));
  });
});

describe("averageRetentionTrend", () => {
  const recent = [{ reviewedAt: addDays(NOW, -2), strengthAfter: memoryStrength(3) }];
  const old = [{ reviewedAt: addDays(NOW, -20), strengthAfter: memoryStrength(1) }];

  it("returns one point per day from -past to +future", () => {
    const trend = averageRetentionTrend([recent, old], NOW, { pastDays: 5, futureDays: 3 });
    expect(trend.map((p) => p.offsetDays)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3]);
    expect(trend.filter((p) => p.projected).map((p) => p.offsetDays)).toEqual([1, 2, 3]);
  });

  it("averages only the topics that existed at each instant", () => {
    const trend = averageRetentionTrend([recent, old], NOW, { pastDays: 5, futureDays: 0 });
    expect(trend[0].topicCount).toBe(1); // 5 days ago only `old` existed
    expect(trend.at(-1)!.topicCount).toBe(2);
    const expected = (retentionAfter(2, memoryStrength(3)) + retentionAfter(20, memoryStrength(1))) / 2;
    expect(trend.at(-1)!.averageRetention).toBeCloseTo(expected, 12);
  });

  it("is null when no topic existed yet", () => {
    const trend = averageRetentionTrend([recent], NOW, { pastDays: 5, futureDays: 0 });
    expect(trend[0].averageRetention).toBeNull();
  });

  it("projects a steady decline when no reviews happen", () => {
    const trend = averageRetentionTrend([recent], NOW, { pastDays: 0, futureDays: 10 });
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].averageRetention!).toBeLessThan(trend[i - 1].averageRetention!);
    }
  });
});

describe("summarize", () => {
  it("returns empty stats with no topics", () => {
    expect(summarize([], NOW, SP)).toEqual({
      totalTopics: 0,
      criticalTopics: 0,
      averageRetention: null,
      dueToday: 0,
      overdue: 0,
    });
  });

  it("counts critical, due and overdue topics", () => {
    const fresh = stateAfterSession(addDays(NOW, -0.1), 3); // ~99%, due in a week
    const dueToday = stateAfterSession(addDays(NOW, -1), 1); // 50%, due now
    const critical = stateAfterSession(addDays(NOW, -6), 1); // ~1.6%, 5 days overdue

    const summary = summarize([fresh, dueToday, critical], NOW, SP);
    expect(summary.totalTopics).toBe(3);
    expect(summary.criticalTopics).toBe(1);
    expect(summary.dueToday).toBe(2);
    expect(summary.overdue).toBe(1);
    expect(summary.averageRetention).toBeGreaterThan(0.45);
    expect(summary.averageRetention).toBeLessThan(0.55);
  });
});

describe("sortByUrgency", () => {
  it("puts the lowest retention first", () => {
    const a = { id: "a", ...stateAfterSession(addDays(NOW, -0.5), 2) };
    const b = { id: "b", ...stateAfterSession(addDays(NOW, -5), 1) };
    const c = { id: "c", ...stateAfterSession(addDays(NOW, -2), 1) };
    expect(sortByUrgency([a, b, c], NOW).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties by the earliest suggested review", () => {
    const base = stateAfterSession(addDays(NOW, -1), 1);
    const later = { id: "later", ...base, nextReviewAt: addDays(NOW, 2) };
    const sooner = { id: "sooner", ...base, nextReviewAt: addDays(NOW, 1) };
    expect(sortByUrgency([later, sooner], NOW).map((t) => t.id)).toEqual(["sooner", "later"]);
  });

  it("does not mutate the input", () => {
    const items = [
      { id: "x", ...stateAfterSession(addDays(NOW, -0.1), 1) },
      { id: "y", ...stateAfterSession(addDays(NOW, -3), 1) },
    ];
    sortByUrgency(items, NOW);
    expect(items.map((t) => t.id)).toEqual(["x", "y"]);
  });
});
