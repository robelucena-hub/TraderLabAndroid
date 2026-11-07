import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <LogoMark className="size-12" />
      <h1 className="mt-6 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Parece que esta página caiu na curva do esquecimento. Ela não existe ou foi removida.
      </p>
      <Button asChild className="mt-6">
        <Link href="/painel">Ir para o painel</Link>
      </Button>
    </main>
  );
}
