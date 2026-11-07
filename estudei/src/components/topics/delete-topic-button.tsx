"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function DeleteTopicButton({ topicId, title }: { topicId: string; title: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove(event: React.MouseEvent) {
    event.preventDefault(); // keep the dialog open while the request runs
    setDeleting(true);
    const result = await apiFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    if (!result.ok) {
      setDeleting(false);
      toast.error(result.error);
      return;
    }
    toast.success("Tópico excluído.");
    router.push("/painel");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <Trash2Icon aria-hidden /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este tópico?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” e todo o histórico de revisões serão apagados. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={remove} disabled={deleting}>
            {deleting && <Loader2Icon className="animate-spin" aria-hidden />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
