import {
  bandForRetention,
  daysUntilDue,
  dueStatus,
  retentionAt,
  toPercent,
  type DueStatus,
  type RetentionBand,
} from "@/lib/forgetting-curve";
import { topicDecay, type TopicDTO } from "@/lib/types";

/** A topic plus everything derived from the forgetting curve at a given instant. */
export interface TopicView extends TopicDTO {
  retention: number;
  retentionPercent: number;
  band: RetentionBand;
  dueStatus: DueStatus;
  /** Calendar days until the suggested review (negative = overdue). */
  daysUntilDue: number;
}

export function computeTopicView(topic: TopicDTO, now: Date, timeZone: string): TopicView {
  const decay = topicDecay(topic);
  const retention = retentionAt(decay, now);
  return {
    ...topic,
    retention,
    retentionPercent: toPercent(retention),
    band: bandForRetention(retention),
    dueStatus: dueStatus(decay.nextReviewAt, now, timeZone),
    daysUntilDue: daysUntilDue(decay.nextReviewAt, now, timeZone),
  };
}
