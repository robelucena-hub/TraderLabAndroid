"use client";

import { CalendarCheck2Icon, Loader2Icon, PartyPopperIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { BandBadge } from "@/components/retention/band-badge";
import { RetentionRing } from "@/components/retention/retention-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNow } from "@/hooks/use-now";
import { groupByDueStatus } from "@/lib/forgetting-curve";
import { dueLabel, formatDate, plural } from "@/lib/format";
import { computeTopicView, type TopicView } from "@/lib/topic-view";
import type { TopicDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useReviewAction } from "./use-review-action";

const UPCOMING_WINDOW_DAYS = 7;

interface ReviewsViewProps {
  topics: TopicDTO[];
  serverNow: string;
  timeZone: string;
}

export function ReviewsView({ topics, serverNow, timeZone }: ReviewsViewProps) {
  const now = useNow(serverNow);
  const { review, pendingId } = useReviewAction();

  const groups = useMemo(() => {
    const views = topics.map((t) => {
      const view = computeTopicView(t, now, timeZone);
      return { view, nextReviewAt: new Date(view.nextReviewAt) };
    });
    const { overdue, today, upcoming } = groupByDueStatus(views, now, timeZone);
    return {
      overdue: overdue.map((g) => g.view),
      today: today.map((g) => g.view),
      soon: upcoming.filter((g) => g.view.daysUntilDue <= UPCOMING_WINDOW_DAYS).map((g) => g.view),
      later: upcoming.filter((g) => g.view.daysUntilDue > UPCOMING_WINDOW_DAYS).map((g) => g.view),
    };
  }, [topics, now, timeZone]);

  const dueCount = groups.overdue.length + groups.today.length;
  const row = (topic: TopicView) => (
    <ReviewRow
      key={topic.id}
      topic={topic}
      timeZone={timeZone}
      reviewing={pendingId === topic.id}
      onReview={() => review(topic.id, topic.title)}
    />
  );

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Revisões</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dueCount > 0
            ? `Você tem ${plural(dueCount, "revisão", "revisões")} para fazer hoje. Comece pelas atrasadas.`
            : "Agenda baseada nos intervalos de repetição espaçada: 1, 3, 7, 15 e 30 dias."}
        </p>
      </div>

      {topics.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum tópico cadastrado ainda.{" "}
          <Link href="/topicos/novo" className="font-medium text-primary underline-offset-4 hover:underline">
            Cadastrar o primeiro
          </Link>
        </p>
      ) : (
        <>
          {dueCount === 0 && (
            <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
              <PartyPopperIcon className="size-8 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">Tudo em dia!</p>
                <p className="text-sm text-muted-foreground">Nenhuma revisão pendente para hoje.</p>
              </div>
            </div>
          )}
          <Section title="Atrasadas" description="O dia sugerido já passou." items={groups.overdue} render={row} />
          <Section title="Para hoje" description="Momento ideal para revisar." items={groups.today} render={row} />
          <Section
            title={`Próximos ${UPCOMING_WINDOW_DAYS} dias`}
            description="Ainda não precisa revisar."
            items={groups.soon}
            render={row}
          />
          {groups.later.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Mais adiante ({groups.later.length})
              </summary>
              <div className="mt-3 grid gap-2">{groups.later.map(row)}</div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  items,
  render,
}: {
  title: string;
  description: string;
  items: TopicView[];
  render: (topic: TopicView) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{items.length}</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">{description}</span>
      </div>
      <div className="grid gap-2">{items.map(render)}</div>
    </section>
  );
}

function ReviewRow({
  topic,
  timeZone,
  reviewing,
  onReview,
}: {
  topic: TopicView;
  timeZone: string;
  reviewing: boolean;
  onReview: () => void;
}) {
  const overdue = topic.dueStatus === "overdue";
  return (
    <Card className="flex-row items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <RetentionRing percent={topic.retentionPercent} size={48} strokeWidth={5} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/topicos/${topic.id}`}
          className="line-clamp-1 font-medium underline-offset-4 hover:underline"
        >
          {topic.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{topic.subject}</span>
          <span aria-hidden>·</span>
          <span className={cn(overdue && "font-medium text-destructive")}>
            <CalendarCheck2Icon className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
            {dueLabel(topic.daysUntilDue)} ({formatDate(topic.nextReviewAt, timeZone)})
          </span>
          <BandBadge band={topic.band} className="hidden sm:inline-flex" />
        </div>
      </div>
      <Button
        size="sm"
        variant={topic.daysUntilDue <= 0 ? "default" : "outline"}
        disabled={reviewing}
        onClick={onReview}
        aria-label={`Revisar agora: ${topic.title}`}
      >
        {reviewing ? <Loader2Icon className="animate-spin" aria-hidden /> : <RotateCcwIcon aria-hidden />}
        <span className="hidden sm:inline">Revisar agora</span>
      </Button>
    </Card>
  );
}
