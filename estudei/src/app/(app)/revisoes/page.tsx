import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/layout/page-skeletons";
import { ReviewsView } from "@/components/topics/reviews-view";
import { requireUser } from "@/server/auth/session";
import { listTopics, toTopicDTO } from "@/server/topics";

export const metadata: Metadata = { title: "Revisões" };

async function Reviews() {
  const user = await requireUser();
  const topics = await listTopics(user.id);
  return <ReviewsView topics={topics.map(toTopicDTO)} serverNow={new Date().toISOString()} timeZone={user.timezone} />;
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Reviews />
    </Suspense>
  );
}
