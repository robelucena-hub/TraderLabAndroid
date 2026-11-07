import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/layout/page-skeletons";
import { DashboardView } from "@/components/topics/dashboard-view";
import { requireUser } from "@/server/auth/session";
import { getRetentionTrend, listTopics, toTopicDTO } from "@/server/topics";

export const metadata: Metadata = { title: "Painel" };

/** Reads the session and the user's topics at request time (streams behind Suspense). */
async function Dashboard() {
  const user = await requireUser();
  const now = new Date();
  const [topics, trend] = await Promise.all([listTopics(user.id), getRetentionTrend(user.id, now)]);
  return (
    <DashboardView
      userName={user.name}
      timeZone={user.timezone}
      serverNow={now.toISOString()}
      topics={topics.map(toTopicDTO)}
      trend={trend}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
