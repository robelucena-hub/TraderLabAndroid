import type { PrismaClient } from "@/generated/prisma/client";
import { retentionAt } from "@/lib/forgetting-curve";

const BATCH_SIZE = 500;

export interface RecalculationResult {
  updated: number;
  calculatedAt: string;
}

/**
 * Recomputes the retention snapshot (Topic.retention) for every topic, or for
 * one user's topics. Pages always compute retention live from the curve; this
 * job keeps the stored column fresh so it can be filtered/sorted in SQL and
 * read by external tools (BI, notifications).
 *
 * Runs from three places: the "Recalcular" button (one user), the cron
 * endpoint and the `npm run job:recalculate` script (all users).
 *
 * Takes the Prisma client as a parameter so CLI scripts can pass their own.
 */
export async function recalculateRetention(
  prisma: PrismaClient,
  { userId, now = new Date() }: { userId?: string; now?: Date } = {},
): Promise<RecalculationResult> {
  let updated = 0;
  let cursor: string | undefined;

  for (;;) {
    const topics = await prisma.topic.findMany({
      where: userId ? { userId } : undefined,
      select: { id: true, lastReviewedAt: true, strength: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (topics.length === 0) break;

    await prisma.$transaction(
      topics.map((topic) =>
        prisma.topic.update({
          where: { id: topic.id },
          data: { retention: retentionAt(topic, now), retentionUpdatedAt: now },
        }),
      ),
    );

    updated += topics.length;
    cursor = topics[topics.length - 1].id;
    if (topics.length < BATCH_SIZE) break;
  }

  return { updated, calculatedAt: now.toISOString() };
}
