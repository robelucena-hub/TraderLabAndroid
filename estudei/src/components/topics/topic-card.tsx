"use client";

import { AlertTriangleIcon, CalendarClockIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { BandBadge } from "@/components/retention/band-badge";
import { RetentionRing } from "@/components/retention/retention-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { calendarDaysBetween } from "@/lib/forgetting-curve";
import { dueLabel, lastStudiedLabel, plural } from "@/lib/format";
import type { TopicView } from "@/lib/topic-view";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  topic: TopicView;
  now: Date;
  timeZone: string;
  onReview: (topicId: string, title: string) => void;
  reviewing: boolean;
}

export function TopicCard({ topic, now, timeZone, onReview, reviewing }: TopicCardProps) {
  const daysSince = calendarDaysBetween(new Date(topic.lastReviewedAt), now, timeZone);
  const overdue = topic.dueStatus === "overdue";

  return (
    <Card className="gap-0 py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 items-start gap-4 p-4">
        <RetentionRing percent={topic.retentionPercent} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="max-w-full truncate">
              {topic.subject}
            </Badge>
            <BandBadge band={topic.band} />
          </div>
          <Link
            href={`/topicos/${topic.id}`}
            className="mt-2 line-clamp-2 block leading-snug font-semibold underline-offset-4 hover:underline"
          >
            {topic.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastStudiedLabel(daysSince)} · {plural(topic.reviewCount, "sessão", "sessões")}
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-2 border-t px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            overdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {overdue ? <AlertTriangleIcon className="size-3.5" aria-hidden /> : <CalendarClockIcon className="size-3.5" aria-hidden />}
          {dueLabel(topic.daysUntilDue)}
        </span>
        <Button
          size="sm"
          variant={topic.daysUntilDue <= 0 ? "default" : "outline"}
          disabled={reviewing}
          onClick={() => onReview(topic.id, topic.title)}
        >
          {reviewing ? <Loader2Icon className="animate-spin" aria-hidden /> : <RotateCcwIcon aria-hidden />}
          Revisar agora
        </Button>
      </CardFooter>
    </Card>
  );
}
