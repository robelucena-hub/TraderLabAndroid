import { computeTopicView } from "@/lib/topic-view";
import { topicInputSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/http";
import { createTopic, listTopics, toTopicDTO } from "@/server/topics";

/** GET /api/topics — the user's topics with live retention, most urgent first. */
export const GET = withUser(async (_request, user) => {
  const now = new Date();
  const topics = (await listTopics(user.id))
    .map((topic) => computeTopicView(toTopicDTO(topic), now, user.timezone))
    .sort((a, b) => a.retention - b.retention);
  return Response.json({ calculatedAt: now.toISOString(), topics });
});

/** POST /api/topics — creates a topic. */
export const POST = withUser(async (request, user) => {
  const parsed = await parseBody(request, topicInputSchema);
  if ("response" in parsed) return parsed.response;
  const topic = await createTopic(user.id, parsed.data);
  return Response.json({ topic: toTopicDTO(topic) }, { status: 201 });
});
