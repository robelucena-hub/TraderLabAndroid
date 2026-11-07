import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/layout/page-skeletons";
import { TopicDetailView } from "@/components/topics/topic-detail-view";
import { requireUser } from "@/server/auth/session";
import { getTopicWithReviews, toReviewDTO, toTopicDTO } from "@/server/topics";

export const metadata: Metadata = { title: "Tópico" };

async function TopicDetail({ params }: { params: PageProps<"/topicos/[id]">["params"] }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const found = await getTopicWithReviews(user.id, id);
  if (!found) notFound();
  return (
    <TopicDetailView
      topic={toTopicDTO(found.topic)}
      reviews={found.reviews.map(toReviewDTO)}
      serverNow={new Date().toISOString()}
      timeZone={user.timezone}
    />
  );
}

export default function TopicPage({ params }: PageProps<"/topicos/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TopicDetail params={params} />
    </Suspense>
  );
}
