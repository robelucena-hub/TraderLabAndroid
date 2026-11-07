import { BellRingIcon, CalendarRangeIcon, LineChartIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { CurveIllustration } from "@/components/marketing/curve-illustration";
import { RetentionLegend } from "@/components/retention/retention-legend";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";

const FEATURES = [
  {
    icon: LineChartIcon,
    title: "Curva do esquecimento",
    text: "Cada tópico tem uma retenção estimada pela fórmula de Ebbinghaus, R = e^(−t/S), que cai com o tempo desde a última revisão.",
  },
  {
    icon: BellRingIcon,
    title: "Cores que avisam",
    text: "Do verde ao vermelho: você vê na hora o que está fresco e o que está sumindo da memória.",
  },
  {
    icon: CalendarRangeIcon,
    title: "Revisões espaçadas",
    text: "Intervalos de 1, 3, 7, 15 e 30 dias. Cada revisão fortalece a memória e afasta a próxima.",
  },
];

/** Session-dependent call to action, streamed in behind Suspense. */
async function HeroActions() {
  const user = await getCurrentUser();
  if (user) {
    return (
      <Button size="lg" asChild>
        <Link href="/painel">Abrir meu painel</Link>
      </Button>
    );
  }
  return <GuestActions />;
}

function GuestActions() {
  return (
    <>
      <Button size="lg" asChild>
        <Link href="/cadastro">Começar grátis</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/entrar">Já tenho conta</Link>
      </Button>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/entrar">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-semibold text-primary">Para estudantes que querem lembrar no dia da prova</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Estude no ritmo da sua memória.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
              O ESTUDEI calcula quanto você ainda lembra de cada assunto com a curva do esquecimento de Ebbinghaus e
              avisa, por cores, a hora certa de revisar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Suspense fallback={<GuestActions />}>
                <HeroActions />
              </Suspense>
            </div>
          </div>
          <Card className="gap-3">
            <CardContent>
              <CurveIllustration />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-primary" aria-hidden /> Revisando nos dias sugeridos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t-2 border-dashed border-muted-foreground" aria-hidden /> Sem revisar
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-label="Como funciona" className="grid gap-4 pb-12 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="grid gap-2">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 pb-20 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Uma cor para cada momento</h2>
            <p className="mt-2 text-muted-foreground">
              A retenção vai de 100% (acabou de estudar) a 0%. Quando o tópico chega ao amarelo, é o ponto ideal para
              revisar: você ainda lembra boa parte, e a revisão rende mais.
            </p>
          </div>
          <Card>
            <CardContent>
              <RetentionLegend />
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>ESTUDEI · organizador de estudos com repetição espaçada</span>
          <span>Para estudantes a partir de 18 anos.</span>
        </div>
      </footer>
    </div>
  );
}
