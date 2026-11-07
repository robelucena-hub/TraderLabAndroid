"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { BandBadge } from "@/components/retention/band-badge";
import { RetentionRing } from "@/components/retention/retention-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNow } from "@/hooks/use-now";
import { apiFetch } from "@/lib/api-client";
import {
  bandForRetention,
  daysUntilDue,
  retentionAt,
  stateAfterSession,
  toPercent,
} from "@/lib/forgetting-curve";
import { dueLabel, formatDate } from "@/lib/format";
import { fromZonedInputValue, toZonedInputValue } from "@/lib/timezone";
import type { TopicDTO } from "@/lib/types";
import type { FieldErrors } from "@/lib/validation";

interface TopicFormProps {
  /** Present when editing. */
  topic?: TopicDTO;
  subjects: string[];
  timeZone: string;
  /** Server timestamp, used as the default "studied at" and as the max date. */
  serverNow: string;
}

export function TopicForm({ topic, subjects, timeZone, serverNow }: TopicFormProps) {
  const router = useRouter();
  // Unique ids: Next.js keeps visited pages mounted, so the "new" and "edit"
  // forms can be in the DOM at the same time.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const now = useNow(serverNow);
  const maxValue = toZonedInputValue(now, timeZone);

  const [title, setTitle] = useState(topic?.title ?? "");
  const [subject, setSubject] = useState(topic?.subject ?? "");
  const [notes, setNotes] = useState(topic?.notes ?? "");
  const [studiedAt, setStudiedAt] = useState(toZonedInputValue(new Date(topic?.lastReviewedAt ?? serverNow), timeZone));
  const [reviewCount, setReviewCount] = useState(String(topic?.reviewCount ?? 1));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Live preview of what the forgetting curve says about the values typed.
  const studiedDate = fromZonedInputValue(studiedAt, timeZone);
  const count = Number(reviewCount);
  const preview =
    studiedDate && Number.isInteger(count) && count >= 1 && count <= 100 && studiedDate.getTime() <= now.getTime() + 60_000
      ? (() => {
          const state = stateAfterSession(studiedDate, count);
          const retention = retentionAt(state, now);
          return {
            percent: toPercent(retention),
            band: bandForRetention(retention),
            due: dueLabel(daysUntilDue(state.nextReviewAt, now, timeZone)),
            dueDate: formatDate(state.nextReviewAt, timeZone),
            interval: state.intervalDays,
          };
        })()
      : null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    const lastReviewedAt = fromZonedInputValue(studiedAt, timeZone);
    if (!lastReviewedAt) {
      setErrors({ lastReviewedAt: "Informe uma data válida." });
      return;
    }

    setSaving(true);
    const body = { title, subject, notes, lastReviewedAt: lastReviewedAt.toISOString(), reviewCount };
    const result = topic
      ? await apiFetch<{ topic: TopicDTO }>(`/api/topics/${topic.id}`, { method: "PATCH", body })
      : await apiFetch<{ topic: TopicDTO }>("/api/topics", { method: "POST", body });
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    toast.success(topic ? "Tópico atualizado." : "Tópico cadastrado! A curva do esquecimento começou a contar.");
    if (!topic) {
      // Next.js keeps this page mounted (hidden) after navigating away; start
      // the next "Novo tópico" visit with an empty form.
      setTitle("");
      setNotes("");
      setReviewCount("1");
      setStudiedAt(toZonedInputValue(new Date(), timeZone));
    }
    router.push(`/topicos/${result.data.topic.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="grid gap-5">
        <Field id={fid("title")} label="Título" error={errors.title}>
          <Input
            id={fid("title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Leis de Newton"
            maxLength={120}
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? fid("title-error") : undefined}
          />
        </Field>

        <Field id={fid("subject")} label="Matéria" hint="Escolha uma existente ou digite uma nova." error={errors.subject}>
          <Input
            id={fid("subject")}
            list={fid("subject-options")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex.: Física"
            maxLength={60}
            required
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? fid("subject-error") : fid("subject-hint")}
          />
          <datalist id={fid("subject-options")}>
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        <Field id={fid("notes")} label="Anotações" hint="Opcional: resumo, fórmulas, pontos de dúvida." error={errors.notes}>
          <Textarea
            id={fid("notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            maxLength={5000}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? fid("notes-error") : fid("notes-hint")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={fid("lastReviewedAt")} label="Último estudo ou revisão" error={errors.lastReviewedAt}>
            <Input
              id={fid("lastReviewedAt")}
              type="datetime-local"
              value={studiedAt}
              max={maxValue}
              onChange={(e) => setStudiedAt(e.target.value)}
              required
              aria-invalid={Boolean(errors.lastReviewedAt)}
              aria-describedby={errors.lastReviewedAt ? fid("lastReviewedAt-error") : undefined}
            />
          </Field>
          <Field
            id={fid("reviewCount")}
            label="Sessões de estudo"
            hint="Quantas vezes você já estudou o tópico, contando a primeira."
            error={errors.reviewCount}
          >
            <Input
              id={fid("reviewCount")}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
              value={reviewCount}
              onChange={(e) => setReviewCount(e.target.value)}
              required
              aria-invalid={Boolean(errors.reviewCount)}
              aria-describedby={errors.reviewCount ? fid("reviewCount-error") : fid("reviewCount-hint")}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2Icon className="animate-spin" aria-hidden />}
            {topic ? "Salvar alterações" : "Cadastrar tópico"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>

      <aside className="h-fit rounded-xl border bg-muted/40 p-5 lg:sticky lg:top-20" aria-live="polite">
        <h2 className="text-sm font-semibold">Prévia da curva</h2>
        {preview ? (
          <div className="mt-4 grid gap-3">
            <div className="flex items-center gap-4">
              <RetentionRing percent={preview.percent} size={72} />
              <div className="grid gap-1.5">
                <BandBadge band={preview.band} />
                <span className="text-xs text-muted-foreground">retenção estimada agora</span>
              </div>
            </div>
            <p className="text-sm">
              <span className="font-medium">{preview.due}</span>
              <span className="text-muted-foreground"> ({preview.dueDate})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Intervalo atual: {preview.interval} {preview.interval === 1 ? "dia" : "dias"}. Os intervalos crescem a cada
              revisão: 1, 3, 7, 15 e 30 dias.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Preencha a data e o número de sessões para ver a prévia.</p>
        )}
      </aside>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
