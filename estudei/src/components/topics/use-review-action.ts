"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { plural } from "@/lib/format";
import type { ReviewDTO, ReviewOutcome, TopicDTO } from "@/lib/types";

/**
 * "Revisar agora": logs a review through the API, shows a toast with an
 * undo action and refreshes the server-rendered data.
 */
export function useReviewAction() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function undo(topicId: string) {
    const result = await apiFetch<{ topic: TopicDTO }>(`/api/topics/${topicId}/reviews`, { method: "DELETE" });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast("Revisão desfeita.");
    router.refresh();
  }

  async function review(topicId: string, title: string, outcome: ReviewOutcome = "REMEMBERED") {
    setPendingId(topicId);
    const result = await apiFetch<{ topic: TopicDTO; review: ReviewDTO }>(`/api/topics/${topicId}/reviews`, {
      method: "POST",
      body: { outcome },
    });
    setPendingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const interval = plural(result.data.review.intervalDays, "dia", "dias");
    toast.success(outcome === "FORGOT" ? "Curva reiniciada do começo." : "Revisão registrada!", {
      description: `“${title}”: próxima revisão em ${interval}.`,
      action: { label: "Desfazer", onClick: () => void undo(topicId) },
    });
    router.refresh();
  }

  return { review, pendingId };
}
