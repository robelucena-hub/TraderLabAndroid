import "server-only";
import type { Review, Topic } from "@/generated/prisma/client";
import {
  addDays,
  applyReview,
  averageRetentionTrend,
  retentionAt,
  stateAfterSession,
  type HistoryPoint,
} from "@/lib/forgetting-curve";
import type { ReviewDTO, ReviewOutcome, TopicDTO, TrendPointDTO } from "@/lib/types";
import type { TopicInput, TopicUpdate } from "@/lib/validation";
import { db } from "./db";
import { NotFoundError, ValidationError } from "./errors";

/**
 * Topic service: every function takes the owner's userId and only touches
 * that user's rows. Route handlers and pages call these after authenticating.
 */

export function toTopicDTO(topic: Topic): TopicDTO {
  return {
    id: topic.id,
    title: topic.title,
    subject: topic.subject,
    notes: topic.notes,
    reviewCount: topic.reviewCount,
    lastReviewedAt: topic.lastReviewedAt.toISOString(),
    nextReviewAt: topic.nextReviewAt.toISOString(),
    strength: topic.strength,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  };
}

export function toReviewDTO(review: Review): ReviewDTO {
  return {
    id: review.id,
    reviewedAt: review.reviewedAt.toISOString(),
    outcome: review.outcome,
    retentionBefore: review.retentionBefore,
    reviewNumber: review.reviewNumber,
    strengthAfter: review.strengthAfter,
    intervalDays: review.intervalDays,
  };
}

async function findOwnedTopic(userId: string, topicId: string): Promise<Topic> {
  const topic = await db().topic.findFirst({ where: { id: topicId, userId } });
  if (!topic) throw new NotFoundError();
  return topic;
}

export async function listTopics(userId: string): Promise<Topic[]> {
  return db().topic.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function listSubjects(userId: string): Promise<string[]> {
  const rows = await db().topic.findMany({
    where: { userId },
    distinct: ["subject"],
    select: { subject: true },
    orderBy: { subject: "asc" },
  });
  return rows.map((row) => row.subject);
}

export async function getTopicWithReviews(
  userId: string,
  topicId: string,
): Promise<{ topic: Topic; reviews: Review[] } | null> {
  const topic = await db().topic.findFirst({
    where: { id: topicId, userId },
    include: { reviews: { orderBy: { reviewedAt: "desc" } } },
  });
  if (!topic) return null;
  const { reviews, ...rest } = topic;
  return { topic: rest, reviews };
}

/**
 * Creates a topic. The first study session (or the latest one, when importing
 * a topic already reviewed several times) becomes its first Review row.
 */
export async function createTopic(userId: string, input: TopicInput, now = new Date()): Promise<Topic> {
  const state = stateAfterSession(input.lastReviewedAt, input.reviewCount);
  return db().topic.create({
    data: {
      userId,
      title: input.title,
      subject: input.subject,
      notes: input.notes,
      reviewCount: state.reviewCount,
      lastReviewedAt: state.lastReviewedAt,
      strength: state.strength,
      nextReviewAt: state.nextReviewAt,
      retention: retentionAt(state, now),
      retentionUpdatedAt: now,
      reviews: {
        create: {
          reviewedAt: state.lastReviewedAt,
          outcome: "REMEMBERED",
          retentionBefore: null,
          reviewNumber: state.reviewCount,
          strengthAfter: state.strength,
          intervalDays: state.intervalDays,
        },
      },
    },
  });
}

/**
 * Updates a topic (any subset of fields). When the last-review date or the
 * review count change, the latest Review row is corrected too, so the history
 * stays consistent.
 */
export async function updateTopic(
  userId: string,
  topicId: string,
  changes: TopicUpdate,
  { now = new Date(), timeZone = "America/Sao_Paulo" }: { now?: Date; timeZone?: string } = {},
): Promise<Topic> {
  const topic = await findOwnedTopic(userId, topicId);
  const input: TopicInput = {
    title: changes.title ?? topic.title,
    subject: changes.subject ?? topic.subject,
    notes: changes.notes !== undefined ? changes.notes : topic.notes,
    lastReviewedAt: changes.lastReviewedAt ?? topic.lastReviewedAt,
    reviewCount: changes.reviewCount ?? topic.reviewCount,
  };
  const scheduleChanged =
    topic.lastReviewedAt.getTime() !== input.lastReviewedAt.getTime() ||
    topic.reviewCount !== input.reviewCount;

  const textData = { title: input.title, subject: input.subject, notes: input.notes };
  if (!scheduleChanged) {
    return db().topic.update({ where: { id: topic.id }, data: textData });
  }

  const [latest, previous] = await db().review.findMany({
    where: { topicId: topic.id },
    orderBy: { reviewedAt: "desc" },
    take: 2,
  });

  if (previous && input.lastReviewedAt.getTime() <= previous.reviewedAt.getTime()) {
    const formatted = previous.reviewedAt.toLocaleString("pt-BR", {
      timeZone,
      dateStyle: "short",
      timeStyle: "short",
    });
    throw new ValidationError("A data da última revisão precisa ser posterior à revisão anterior.", {
      lastReviewedAt: `Precisa ser posterior à revisão anterior (${formatted}).`,
    });
  }

  const state = stateAfterSession(input.lastReviewedAt, input.reviewCount);
  const retentionBefore = previous
    ? retentionAt({ lastReviewedAt: previous.reviewedAt, strength: previous.strengthAfter }, state.lastReviewedAt)
    : null;

  const [updated] = await db().$transaction([
    db().topic.update({
      where: { id: topic.id },
      data: {
        ...textData,
        reviewCount: state.reviewCount,
        lastReviewedAt: state.lastReviewedAt,
        strength: state.strength,
        nextReviewAt: state.nextReviewAt,
        retention: retentionAt(state, now),
        retentionUpdatedAt: now,
      },
    }),
    latest
      ? db().review.update({
          where: { id: latest.id },
          data: {
            reviewedAt: state.lastReviewedAt,
            reviewNumber: state.reviewCount,
            strengthAfter: state.strength,
            intervalDays: state.intervalDays,
            retentionBefore,
          },
        })
      : db().review.create({
          data: {
            topicId: topic.id,
            reviewedAt: state.lastReviewedAt,
            reviewNumber: state.reviewCount,
            strengthAfter: state.strength,
            intervalDays: state.intervalDays,
          },
        }),
  ]);
  return updated;
}

export async function deleteTopic(userId: string, topicId: string): Promise<void> {
  const { count } = await db().topic.deleteMany({ where: { id: topicId, userId } });
  if (count === 0) throw new NotFoundError();
}

/** Logs a review: resets the decay and moves the topic along the ladder. */
export async function reviewTopic(
  userId: string,
  topicId: string,
  outcome: ReviewOutcome,
  now = new Date(),
): Promise<{ topic: Topic; review: Review }> {
  const topic = await findOwnedTopic(userId, topicId);
  const result = applyReview(topic, outcome, now);

  const [review, updated] = await db().$transaction([
    db().review.create({
      data: {
        topicId: topic.id,
        reviewedAt: now,
        outcome,
        retentionBefore: result.retentionBefore,
        reviewNumber: result.reviewCount,
        strengthAfter: result.strength,
        intervalDays: result.intervalDays,
      },
    }),
    db().topic.update({
      where: { id: topic.id },
      data: {
        reviewCount: result.reviewCount,
        lastReviewedAt: result.lastReviewedAt,
        strength: result.strength,
        nextReviewAt: result.nextReviewAt,
        retention: 1,
        retentionUpdatedAt: now,
      },
    }),
  ]);
  return { topic: updated, review };
}

/**
 * Undoes the latest review (e.g. an accidental click), restoring the state
 * stored in the previous Review row. The first study session cannot be undone.
 */
export async function undoLatestReview(userId: string, topicId: string, now = new Date()): Promise<Topic> {
  const topic = await findOwnedTopic(userId, topicId);
  const [latest, previous] = await db().review.findMany({
    where: { topicId: topic.id },
    orderBy: { reviewedAt: "desc" },
    take: 2,
  });
  if (!latest || !previous) {
    throw new ValidationError("Não há revisão para desfazer.");
  }

  const restored = {
    reviewCount: previous.reviewNumber,
    lastReviewedAt: previous.reviewedAt,
    strength: previous.strengthAfter,
    nextReviewAt: addDays(previous.reviewedAt, previous.intervalDays),
  };

  const [, updated] = await db().$transaction([
    db().review.delete({ where: { id: latest.id } }),
    db().topic.update({
      where: { id: topic.id },
      data: { ...restored, retention: retentionAt(restored, now), retentionUpdatedAt: now },
    }),
  ]);
  return updated;
}

/** Average retention over the last 30 days (replayed) and next 30 (projected). */
export async function getRetentionTrend(userId: string, now = new Date()): Promise<TrendPointDTO[]> {
  const reviews = await db().review.findMany({
    where: { topic: { userId } },
    select: { topicId: true, reviewedAt: true, strengthAfter: true },
  });

  const histories = new Map<string, HistoryPoint[]>();
  for (const review of reviews) {
    const list = histories.get(review.topicId) ?? [];
    list.push({ reviewedAt: review.reviewedAt, strengthAfter: review.strengthAfter });
    histories.set(review.topicId, list);
  }

  return averageRetentionTrend([...histories.values()], now, { pastDays: 30, futureDays: 30 }).map(
    (point) => ({
      offsetDays: point.offsetDays,
      date: point.date.toISOString(),
      averagePercent: point.averageRetention === null ? null : Math.round(point.averageRetention * 1000) / 10,
      topicCount: point.topicCount,
      projected: point.projected,
    }),
  );
}
