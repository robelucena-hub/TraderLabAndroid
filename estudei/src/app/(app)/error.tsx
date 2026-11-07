"use client";

import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <AlertCircleIcon className="size-10 text-destructive" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
      </p>
      <Button className="mt-6" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
