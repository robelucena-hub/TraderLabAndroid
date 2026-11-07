"use client";

import {
  AlertTriangleIcon,
  BookOpenIcon,
  BrainIcon,
  CalendarCheckIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TrendChart } from "@/components/charts/trend-chart";
import { RetentionLegend } from "@/components/retention/retention-legend";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNow } from "@/hooks/use-now";
import { bandForRetention, sortByUrgency, summarize, toPercent } from "@/lib/forgetting-curve";
import { firstName, formatLongDate, formatPercent, plural } from "@/lib/format";
import { computeTopicView, type TopicView } from "@/lib/topic-view";
import { topicDecay, type TopicDTO, type TrendPointDTO } from "@/lib/types";
import { RecalculateButton } from "./recalculate-button";
import { StatTile } from "./stat-tile";
import { TopicCard } from "./topic-card";
import { useReviewAction } from "./use-review-action";

type SortKey = "urgency" | "next-review" | "recent" | "title";
const ALL_SUBJECTS = "__all";

const SORTS: Record<SortKey, { label: string; sort: (topics: TopicView[], now: Date) => TopicView[] }> = {
  urgency: {
    label: "Mais urgentes",
    sort: (topics, now) => {
      const byId = new Map(topics.map((t) => [t.id, t]));
      return sortByUrgency(topics.map((t) => ({ id: t.id, ...topicDecay(t) })), now).map((t) => byId.get(t.id)!);
    },
  },
  "next-review": {
    label: "Próxima revisão",
    sort: (topics) => [...topics].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt)),
  },
  recent: {
    label: "Estudados recentemente",
    sort: (topics) => [...topics].sort((a, b) => b.lastReviewedAt.localeCompare(a.lastReviewedAt)),
  },
  title: {
    label: "Ordem alfabética",
    sort: (topics) => [...topics].sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
  },
};

interface DashboardViewProps {
  userName: string;
  timeZone: string;
  serverNow: string;
  topics: TopicDTO[];
  trend: TrendPointDTO[];
}

export function DashboardView({ userName, timeZone, serverNow, topics, trend }: DashboardViewProps) {
  // Retention keeps decaying while the page is open: recompute every minute.
  const now = useNow(serverNow);
  const { review, pendingId } = useReviewAction();

  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(ALL_SUBJECTS);
  const [sortKey, setSortKey] = useState<SortKey>("urgency");

  const views = useMemo(() => topics.map((t) => computeTopicView(t, now, timeZone)), [topics, now, timeZone]);
  const summary = useMemo(() => summarize(topics.map(topicDecay), now, timeZone), [topics, now, timeZone]);
  const subjects = useMemo(() => [...new Set(topics.map((t) => t.subject))].sort((a, b) => a.localeCompare(b, "pt-BR")), [topics]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = views.filter(
      (t) =>
        (subject === ALL_SUBJECTS || t.subject === subject) &&
        (!q || t.title.toLocaleLowerCase("pt-BR").includes(q) || t.subject.toLocaleLowerCase("pt-BR").includes(q)),
    );
    return SORTS[sortKey].sort(filtered, now);
  }, [views, query, subject, sortKey, now]);

  const average = summary.averageRetention;
  const subjectCount = subjects.length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Olá, {firstName(userName)}!</h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{formatLongDate(now, timeZone)}</p>
        </div>
        <div className="flex gap-2">
          <RecalculateButton />
          <Button asChild>
            <Link href="/topicos/novo">
              <PlusIcon aria-hidden /> Novo tópico
            </Link>
          </Button>
        </div>
      </div>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Tópicos"
          value={String(summary.totalTopics)}
          hint={subjectCount > 0 ? plural(subjectCount, "matéria", "matérias") : "Nenhuma matéria ainda"}
          icon={BookOpenIcon}
        />
        <StatTile
          label="Zona crítica"
          value={String(summary.criticalTopics)}
          hint="abaixo de 20% de retenção"
          icon={AlertTriangleIcon}
          dotClassName="bg-band-critical"
        />
        <StatTile
          label="Retenção média"
          value={average === null ? "—" : formatPercent(toPercent(average))}
          hint={average === null ? "sem tópicos" : bandForRetention(average).label}
          icon={BrainIcon}
        />
        <StatTile
          label="Para revisar hoje"
          value={String(summary.dueToday)}
          hint={
            <Link href="/revisoes" className="underline-offset-4 hover:underline">
              {summary.overdue > 0 ? `${plural(summary.overdue, "atrasada", "atrasadas")} · ver lista` : "Ver lista de revisões"}
            </Link>
          }
          icon={CalendarCheckIcon}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Retenção média ao longo do tempo</CardTitle>
            <CardDescription>Últimos 30 dias e o que acontece nos próximos 30 se você não revisar.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart points={trend} timeZone={timeZone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>O que as cores significam</CardTitle>
            <CardDescription>Retenção estimada pela curva R = e^(−t/S).</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionLegend />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="topics-heading" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="topics-heading" className="text-lg font-semibold">
            Seus tópicos
          </h2>
          {topics.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <div className="relative w-full sm:w-56">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  placeholder="Buscar tópico…"
                  aria-label="Buscar tópico"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-44" aria-label="Filtrar por matéria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SUBJECTS}>Todas as matérias</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-48" aria-label="Ordenar tópicos">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORTS) as SortKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SORTS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {topics.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum tópico encontrado com esses filtros.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                now={now}
                timeZone={timeZone}
                onReview={review}
                reviewing={pendingId === topic.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <SparklesIcon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold">Comece pelo que você estudou hoje</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Cadastre um tópico e o ESTUDEI passa a calcular quanto você ainda lembra dele, avisando a hora certa de revisar.
      </p>
      <Button asChild className="mt-5">
        <Link href="/topicos/novo">
          <PlusIcon aria-hidden /> Cadastrar primeiro tópico
        </Link>
      </Button>
    </div>
  );
}
