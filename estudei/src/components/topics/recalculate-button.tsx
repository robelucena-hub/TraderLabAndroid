"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { plural } from "@/lib/format";

/** On-demand refresh: recalculates and stores retention, then re-renders the page. */
export function RecalculateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function recalculate() {
    setBusy(true);
    const result = await apiFetch<{ updated: number }>("/api/retention/recalculate", { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Retenção recalculada (${plural(result.data.updated, "tópico", "tópicos")}).`);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={recalculate} disabled={busy}>
      {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : <RefreshCwIcon aria-hidden />}
      Recalcular
    </Button>
  );
}
