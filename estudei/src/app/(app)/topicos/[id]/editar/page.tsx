import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/layout/page-skeletons";
import { TopicForm } from "@/components/topics/topic-form";
import { requireUser } from "@/server/auth/session";
import { getTopicWithReviews, listSubjects, toTopicDTO } from "@/server/topics";

export const metadata: Metadata = { title: "Editar tópico" };

async function EditTopic({ params }: { params: PageProps<"/topicos/[id]/editar">["params"] }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const [found, subjects] = await Promise.all([getTopicWithReviews(user.id, id), listSubjects(user.id)]);
  if (!found) notFound();
  const topic = toTopicDTO(found.topic);

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href={`/topicos/${topic.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> Voltar ao tópico
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Editar tópico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alterar a data ou o número de sessões recalcula a curva e a próxima revisão.
        </p>
      </div>
      {/* Keyed by updatedAt: Next.js keeps visited pages mounted (hidden), so a
          review done elsewhere must reset this form instead of showing stale values. */}
      <TopicForm key={topic.updatedAt} topic={topic} subjects={subjects} timeZone={user.timezone} serverNow={new Date().toISOString()} />
    </div>
  );
}

export default function EditTopicPage({ params }: PageProps<"/topicos/[id]/editar">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditTopic params={params} />
    </Suspense>
  );
}
