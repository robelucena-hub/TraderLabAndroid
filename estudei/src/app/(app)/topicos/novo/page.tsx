import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/layout/page-skeletons";
import { TopicForm } from "@/components/topics/topic-form";
import { requireUser } from "@/server/auth/session";
import { listSubjects } from "@/server/topics";

export const metadata: Metadata = { title: "Novo tópico" };

async function NewTopicForm() {
  const user = await requireUser();
  const subjects = await listSubjects(user.id);
  return <TopicForm subjects={subjects} timeZone={user.timezone} serverNow={new Date().toISOString()} />;
}

export default function NewTopicPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Novo tópico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre o que você estudou. A curva do esquecimento começa a contar a partir do último estudo.
        </p>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <NewTopicForm />
      </Suspense>
    </div>
  );
}
