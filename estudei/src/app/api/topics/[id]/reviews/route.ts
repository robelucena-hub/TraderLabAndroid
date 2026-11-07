import { reviewInputSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/http";
import { reviewTopic, toReviewDTO, toTopicDTO, undoLatestReview } from "@/server/topics";

type Context = RouteContext<"/api/topics/[id]/reviews">;

/**
 * POST /api/topics/:id/reviews — logs a review ("Revisar agora").
 * Body (optional): { "outcome": "REMEMBERED" | "FORGOT" }
 */
export const POST = withUser<Context>(async (request, user, { params }) => {
  const { id } = await params;
  const parsed = await parseBody(request, reviewInputSchema, { allowEmpty: true });
  if ("response" in parsed) return parsed.response;
  const { topic, review } = await reviewTopic(user.id, id, parsed.data.outcome);
  return Response.json({ topic: toTopicDTO(topic), review: toReviewDTO(review) }, { status: 201 });
});

/** DELETE /api/topics/:id/reviews — undoes the latest review. */
export const DELETE = withUser<Context>(async (_request, user, { params }) => {
  const { id } = await params;
  const topic = await undoLatestReview(user.id, id);
  return Response.json({ topic: toTopicDTO(topic) });
});
