import { addDays, intervalForReview } from "./curve";

/**
 * Calendar logic for review scheduling.
 *
 * "Due today" depends on the user's time zone: a review due at 23:00 in São
 * Paulo is already "tomorrow" in UTC. All functions here take an explicit IANA
 * time zone and compare calendar days in that zone.
 */

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();

function dayKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dayKeyFormatters.get(timeZone);
  if (!formatter) {
    // en-CA formats dates as YYYY-MM-DD.
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayKeyFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Calendar day of `date` in `timeZone`, as "YYYY-MM-DD". */
export function calendarDayKey(date: Date, timeZone: string): string {
  return dayKeyFormatter(timeZone).format(date);
}

function dayKeyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Whole calendar days from `from` to `to` in `timeZone`.
 * Example: 23:50 today → 00:10 tomorrow = 1 day.
 */
export function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  const diff = dayKeyToUtcMs(calendarDayKey(to, timeZone)) - dayKeyToUtcMs(calendarDayKey(from, timeZone));
  return Math.round(diff / 86_400_000);
}

export type DueStatus = "overdue" | "today" | "upcoming";

/** Calendar days until a review is due (negative = overdue by that many days). */
export function daysUntilDue(nextReviewAt: Date, now: Date, timeZone: string): number {
  return calendarDaysBetween(now, nextReviewAt, timeZone);
}

export function dueStatus(nextReviewAt: Date, now: Date, timeZone: string): DueStatus {
  const days = daysUntilDue(nextReviewAt, now, timeZone);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return "upcoming";
}

/** True when the review is due today or earlier ("para revisar hoje"). */
export function isDueByToday(nextReviewAt: Date, now: Date, timeZone: string): boolean {
  return daysUntilDue(nextReviewAt, now, timeZone) <= 0;
}

export interface DueGroups<T> {
  overdue: T[];
  today: T[];
  upcoming: T[];
}

/** Splits items into overdue / due today / upcoming, each sorted by due date. */
export function groupByDueStatus<T extends { nextReviewAt: Date }>(
  items: readonly T[],
  now: Date,
  timeZone: string,
): DueGroups<T> {
  const groups: DueGroups<T> = { overdue: [], today: [], upcoming: [] };
  const sorted = [...items].sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime());
  for (const item of sorted) {
    groups[dueStatus(item.nextReviewAt, now, timeZone)].push(item);
  }
  return groups;
}

export interface PlannedReview {
  /** Session number this review will be (current reviewCount + 1, + 2, ...). */
  reviewNumber: number;
  date: Date;
  /** Days after the previous session. */
  intervalDays: number;
}

/**
 * The next `count` suggested review dates, assuming each review is done on
 * the suggested day. The first entry equals the topic's nextReviewAt.
 */
export function plannedReviews(lastReviewedAt: Date, reviewCount: number, count = 4): PlannedReview[] {
  const plan: PlannedReview[] = [];
  let date = lastReviewedAt;
  for (let n = reviewCount; n < reviewCount + count; n++) {
    const intervalDays = intervalForReview(n);
    date = addDays(date, intervalDays);
    plan.push({ reviewNumber: n + 1, date, intervalDays });
  }
  return plan;
}
