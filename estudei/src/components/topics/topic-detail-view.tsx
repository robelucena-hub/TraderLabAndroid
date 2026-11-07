"use client";

import { ArrowLeftIcon, CheckIcon, Loader2Icon, PencilIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { RetentionCurveChart } from "@/components/charts/retention-curve-chart";
import { BandBadge } from "@/components/retention/band-badge";
import { RetentionRing } from "@/components/retention/retention-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNow } from "@/hooks/use-now";
import {
  TARGET_RETENTION_AT_DUE,
  calendarDaysBetween,
  daysUntilRetention,
  plannedReviews,
  toPercent,
} from "@/lib/forgetting-curve";
import { dueLabel, formatDate, formatDateTime, formatDays, plural, relativeDay } from "@/lib/format";
import { computeTopicView } from "@/lib/topic-view";
import { topicDecay, type ReviewDTO, type TopicDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeleteTopicButton } from "./delete-topic-button";
import { useReviewAction } from "./use-review-action";

interface TopicDetailViewProps {
  topic: TopicDTO;
  reviews: ReviewDTO[];
  serverNow: string;
  timeZone: string;
}

export function TopicDetailView({ topic, reviews, serverNow, timeZone }: TopicDetailViewProps) {
  const now = useNow(serverNow);
  const view = computeTopicView(topic, now, timeZone);
  const decay = topicDecay(topic);
  const { review, pendingId } = useReviewAction();
  const busy = pendingId === topic.id;

  const daysSince = calendarDaysBetween(decay.lastReviewedAt, now, timeZone);
  const halfLife = daysUntilRetention(topic.strength, TARGET_RETENTION_AT_DUE);
  const plan = plannedReviews(decay.lastReviewedAt, topic.reviewCount, 4);

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/painel"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> Voltar ao painel
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge variant="secondary">{topic.subject}</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight break-words sm:text-3xl">{topic.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/topicos/${topic.id}/editar`}>
                <PencilIcon aria-hidden /> Editar
              </Link>
            </Button>
            <DeleteTopicButton topicId={topic.id} title={topic.title} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit lg:row-span-2">
          <CardContent className="grid gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <RetentionRing percent={view.retentionPercent} size={148} strokeWidth={12} caption="retenção agora" />
              <BandBadge band={view.band} className="text-sm" />
              <p className="text-sm text-muted-foreground">{view.band.description}</p>
            </div>

            <div className="grid gap-2">
              <Button disabled={busy} onClick={() => review(topic.id, topic.title, "REMEMBERED")}>
                {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : <CheckIcon aria-hidden />}
                Revisei e lembrei
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => review(topic.id, topic.title, "FORGOT")}>
                <RotateCcwIcon aria-hidden /> Revisei, mas tinha esquecido
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                “Tinha esquecido” recomeça a escada de intervalos do primeiro degrau.
              </p>
            </div>

            <dl className="grid gap-3 border-t pt-4 text-sm">
              <Fact label="Último estudo">
                {formatDateTime(decay.lastReviewedAt, timeZone)} ({relativeDay(-daysSince)})
              </Fact>
              <Fact label="Próxima revisão sugerida">
                <span className={cn(view.dueStatus === "overdue" && "font-medium text-destructive")}>
                  {formatDate(decay.nextReviewAt, timeZone)} · {dueLabel(view.daysUntilDue)}
                </span>
              </Fact>
              <Fact label="Sessões de estudo">
                {topic.reviewCount} (1º estudo{topic.reviewCount > 1 ? ` + ${plural(topic.reviewCount - 1, "revisão", "revisões")}` : ""})
              </Fact>
              <Fact label="Força da memória (S)">
                {formatDays(topic.strength)} · cai para 50% em {formatDays(halfLife)}
              </Fact>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Curva do esquecimento</CardTitle>
            <CardDescription>
              Quanto você deve lembrar nos próximos 30 dias. Revisar agora deixa a curva mais lenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionCurveChart
              lastReviewedAt={decay.lastReviewedAt}
              strength={topic.strength}
              nextReviewAt={decay.nextReviewAt}
              reviewCount={topic.reviewCount}
              now={now}
              timeZone={timeZone}
            />
          </CardContent>
        </Card>
        <Card className={cn(!topic.notes && "lg:col-span-2")}>
          <CardHeader>
            <CardTitle>Próximas revisões</CardTitle>
            <CardDescription>Se cada revisão for feita no dia sugerido.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3">
              {plan.map((step) => (
                <li key={step.reviewNumber} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{step.reviewNumber}ª sessão</span>
                    <span className="text-muted-foreground"> · +{plural(step.intervalDays, "dia", "dias")}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatDate(step.date, timeZone)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {topic.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Anotações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed break-words whitespace-pre-line">{topic.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>{plural(reviews.length, "sessão registrada", "sessões registradas")}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Sessão</th>
                    <th className="px-3 py-2 font-medium">Retenção antes</th>
                    <th className="px-3 py-2 font-medium">Próximo intervalo</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {reviews.map((r, index) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{formatDateTime(r.reviewedAt, timeZone)}</td>
                      <td className="px-3 py-2">
                        {index === reviews.length - 1 && r.retentionBefore === null
                          ? "1º estudo"
                          : r.outcome === "FORGOT"
                            ? "Revisão (esqueci)"
                            : "Revisão"}
                      </td>
                      <td className="px-3 py-2">{r.retentionBefore === null ? "—" : `${toPercent(r.retentionBefore)}%`}</td>
                      <td className="px-3 py-2">{plural(r.intervalDays, "dia", "dias")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
