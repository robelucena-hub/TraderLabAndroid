import { describe, expect, it } from "vitest";
import { addDays } from "./curve";
import {
  calendarDayKey,
  calendarDaysBetween,
  daysUntilDue,
  dueStatus,
  groupByDueStatus,
  isDueByToday,
  isValidTimeZone,
  plannedReviews,
} from "./schedule";

const SP = "America/Sao_Paulo"; // UTC-3, no DST since 2019

describe("calendarDayKey", () => {
  it("uses the user's time zone, not UTC", () => {
    const lateNightInBrazil = new Date("2026-03-02T01:30:00Z"); // 22:30 on Mar 1st in São Paulo
    expect(calendarDayKey(lateNightInBrazil, "UTC")).toBe("2026-03-02");
    expect(calendarDayKey(lateNightInBrazil, SP)).toBe("2026-03-01");
  });
});

describe("calendarDaysBetween", () => {
  it("counts calendar days, not 24h periods", () => {
    const beforeMidnight = new Date("2026-03-02T02:50:00Z"); // 23:50 SP
    const afterMidnight = new Date("2026-03-02T03:10:00Z"); // 00:10 SP next day
    expect(calendarDaysBetween(beforeMidnight, afterMidnight, SP)).toBe(1);
  });

  it("is zero within the same day and negative backwards", () => {
    const morning = new Date("2026-03-01T11:00:00Z");
    const evening = new Date("2026-03-01T22:00:00Z");
    expect(calendarDaysBetween(morning, evening, SP)).toBe(0);
    expect(calendarDaysBetween(addDays(morning, 3), morning, SP)).toBe(-3);
  });

  it("handles daylight saving transitions", () => {
    // New York springs forward on 2026-03-08.
    const before = new Date("2026-03-07T17:00:00Z");
    const after = new Date("2026-03-09T16:00:00Z");
    expect(calendarDaysBetween(before, after, "America/New_York")).toBe(2);
  });
});

describe("dueStatus / daysUntilDue", () => {
  const now = new Date("2026-03-10T15:00:00Z"); // 12:00 in São Paulo

  it("is 'today' for any time later today", () => {
    expect(dueStatus(new Date("2026-03-11T02:00:00Z"), now, SP)).toBe("today"); // 23:00 SP
    expect(dueStatus(new Date("2026-03-10T10:00:00Z"), now, SP)).toBe("today"); // earlier today
  });

  it("is 'overdue' for previous days", () => {
    const due = new Date("2026-03-08T15:00:00Z");
    expect(dueStatus(due, now, SP)).toBe("overdue");
    expect(daysUntilDue(due, now, SP)).toBe(-2);
  });

  it("is 'upcoming' for future days", () => {
    const due = new Date("2026-03-13T15:00:00Z");
    expect(dueStatus(due, now, SP)).toBe("upcoming");
    expect(daysUntilDue(due, now, SP)).toBe(3);
  });

  it("isDueByToday includes overdue reviews", () => {
    expect(isDueByToday(new Date("2026-03-01T00:00:00Z"), now, SP)).toBe(true);
    expect(isDueByToday(new Date("2026-03-10T20:00:00Z"), now, SP)).toBe(true);
    expect(isDueByToday(new Date("2026-03-12T20:00:00Z"), now, SP)).toBe(false);
  });
});

describe("groupByDueStatus", () => {
  it("splits and sorts items by due date", () => {
    const now = new Date("2026-03-10T15:00:00Z");
    const items = [
      { id: "future", nextReviewAt: new Date("2026-03-15T15:00:00Z") },
      { id: "late-2", nextReviewAt: new Date("2026-03-09T15:00:00Z") },
      { id: "today", nextReviewAt: new Date("2026-03-10T18:00:00Z") },
      { id: "late-1", nextReviewAt: new Date("2026-03-05T15:00:00Z") },
    ];
    const groups = groupByDueStatus(items, now, SP);
    expect(groups.overdue.map((i) => i.id)).toEqual(["late-1", "late-2"]);
    expect(groups.today.map((i) => i.id)).toEqual(["today"]);
    expect(groups.upcoming.map((i) => i.id)).toEqual(["future"]);
  });
});

describe("plannedReviews", () => {
  it("lists the next suggested dates along the ladder", () => {
    const last = new Date("2026-03-01T12:00:00Z");
    const plan = plannedReviews(last, 2, 4);
    expect(plan.map((p) => p.reviewNumber)).toEqual([3, 4, 5, 6]);
    expect(plan.map((p) => p.intervalDays)).toEqual([3, 7, 15, 30]);
    expect(plan[0].date).toEqual(addDays(last, 3));
    expect(plan[3].date).toEqual(addDays(last, 3 + 7 + 15 + 30));
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects garbage", () => {
    expect(isValidTimeZone(SP)).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
