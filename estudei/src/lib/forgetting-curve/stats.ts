import { isCritical } from "./bands";
import { retentionAt, type DecayInput } from "./curve";
import { daysUntilDue } from "./schedule";

export interface SchedulableTopic extends DecayInput {
  nextReviewAt: Date;
}

export interface DashboardSummary {
  totalTopics: number;
  /** Topics in the red band (0–19%). */
  criticalTopics: number;
  /** Mean retention (0..1), or null when there are no topics. */
  averageRetention: number | null;
  /** Reviews due today, including overdue ones. */
  dueToday: number;
  /** Reviews whose suggested day has already passed. */
  overdue: number;
}

export function summarize(
  topics: readonly SchedulableTopic[],
  now: Date,
  timeZone: string,
): DashboardSummary {
  let sum = 0;
  let criticalTopics = 0;
  let dueToday = 0;
  let overdue = 0;

  for (const topic of topics) {
    const retention = retentionAt(topic, now);
    sum += retention;
    if (isCritical(retention)) criticalTopics++;
    const days = daysUntilDue(topic.nextReviewAt, now, timeZone);
    if (days <= 0) dueToday++;
    if (days < 0) overdue++;
  }

  return {
    totalTopics: topics.length,
    criticalTopics,
    averageRetention: topics.length > 0 ? sum / topics.length : null,
    dueToday,
    overdue,
  };
}

/** Most urgent first: lowest retention, then earliest suggested review. */
export function sortByUrgency<T extends SchedulableTopic>(topics: readonly T[], now: Date): T[] {
  return topics
    .map((topic) => ({ topic, retention: retentionAt(topic, now) }))
    .sort(
      (a, b) =>
        a.retention - b.retention ||
        a.topic.nextReviewAt.getTime() - b.topic.nextReviewAt.getTime(),
    )
    .map(({ topic }) => topic);
}
