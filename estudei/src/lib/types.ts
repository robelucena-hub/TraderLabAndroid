/**
 * Serializable shapes sent from the server to Client Components and API
 * consumers. Dates travel as ISO strings.
 */

export type ReviewOutcome = "REMEMBERED" | "FORGOT";

export interface TopicDTO {
  id: string;
  title: string;
  subject: string;
  notes: string | null;
  reviewCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  /** Memory strength S, in days. */
  strength: number;
  createdAt: string;
  /** Changes on every edit or review; used to reset preserved form state. */
  updatedAt: string;
}

export interface ReviewDTO {
  id: string;
  reviewedAt: string;
  outcome: ReviewOutcome;
  retentionBefore: number | null;
  reviewNumber: number;
  strengthAfter: number;
  intervalDays: number;
}

export interface TrendPointDTO {
  offsetDays: number;
  date: string;
  /** Average retention as a percentage (0..100), or null with no topics. */
  averagePercent: number | null;
  topicCount: number;
  projected: boolean;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  timezone: string;
}

/** Converts a DTO's ISO dates back into the shape the engine expects. */
export function topicDecay(topic: Pick<TopicDTO, "lastReviewedAt" | "nextReviewAt" | "strength">) {
  return {
    lastReviewedAt: new Date(topic.lastReviewedAt),
    nextReviewAt: new Date(topic.nextReviewAt),
    strength: topic.strength,
  };
}
