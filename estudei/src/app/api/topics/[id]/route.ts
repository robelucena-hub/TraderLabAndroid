import { projectRetention } from "@/lib/forgetting-curve";
import { computeTopicView } from "@/lib/topic-view";
import { topicDecay } from "@/lib/types";
import { topicUpdateSchema } from "@/lib/validation";
import { NotFoundError } from "@/server/errors";
import { parseBody, withUser } from "@/server/http";
import { deleteTopic, getTopicWithReviews, toReviewDTO, toTopicDTO, updateTopic } from "@/server/topics";

type Context = RouteContext<"/api/topics/[id]">;

/** GET /api/topics/:id — topic, review history and the 30-day retention projection. */
export const GET = withUser<Context>(async (_request, user, { params }) => {
  const { id } = await params;
  const found = await getTopicWithReviews(user.id, id);
  if (!found) throw new NotFoundError();

  const now = new Date();
  const dto = toTopicDTO(found.topic);
  const projection = projectRetention(topicDecay(dto), now, 30).map((point) => ({
    day: point.day,
    date: point.date.toISOString(),
    retention: point.retention,
  }));

  return Response.json({
    calculatedAt: now.toISOString(),
    topic: computeTopicView(dto, now, user.timezone),
    reviews: found.reviews.map(toReviewDTO),
    projection,
  });
});

/** PATCH /api/topics/:id — updates any subset of title, subject, notes, lastReviewedAt, reviewCount. */
export const PATCH = withUser<Context>(async (request, user, { params }) => {
  const { id } = await params;
  const parsed = await parseBody(request, topicUpdateSchema);
  if ("response" in parsed) return parsed.response;
  const topic = await updateTopic(user.id, id, parsed.data, { timeZone: user.timezone });
  return Response.json({ topic: toTopicDTO(topic) });
});

/** DELETE /api/topics/:id — deletes the topic and its history. */
export const DELETE = withUser<Context>(async (_request, user, { params }) => {
  const { id } = await params;
  await deleteTopic(user.id, id);
  return new Response(null, { status: 204 });
});
