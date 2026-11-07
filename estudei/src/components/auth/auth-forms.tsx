"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import type { FieldErrors } from "@/lib/validation";

/** Only allow redirects to paths inside the app (prevents open redirects). */
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/painel";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function LoginForm() {
  const router = useRouter();
  const uid = useId(); // unique ids: login and signup pages can both stay mounted
  const fid = (name: string) => `${uid}-${name}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
    if (!result.ok) {
      setBusy(false);
      setErrors(result.fieldErrors ?? {});
      setFormError(result.fieldErrors ? null : result.error);
      return;
    }
    setPassword(""); // the page stays mounted (hidden) after navigating away
    router.replace(safeNextPath());
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Bem-vindo de volta! Suas revisões estão esperando.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          {formError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor={fid("email")}>E-mail</Label>
            <Input
              id={fid("email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? fid("email-error") : undefined}
              required
            />
            <FieldError id={fid("email-error")} message={errors.email} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={fid("password")}>Senha</Label>
            <Input
              id={fid("password")}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? fid("password-error") : undefined}
              required
            />
            <FieldError id={fid("password-error")} message={errors.password} />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" aria-hidden />}
            Entrar
          </Button>
          <p className="text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export function SignupForm() {
  const router = useRouter();
  const uid = useId(); // unique ids: login and signup pages can both stay mounted
  const fid = (name: string) => `${uid}-${name}`;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: { name, email, password, adult, timezone },
    });
    if (!result.ok) {
      setBusy(false);
      setErrors(result.fieldErrors ?? {});
      setFormError(result.fieldErrors ? null : result.error);
      return;
    }
    setPassword(""); // the page stays mounted (hidden) after navigating away
    router.replace("/painel");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>Leva menos de um minuto. É grátis.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          {formError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor={fid("name")}>Nome</Label>
            <Input
              id={fid("name")}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? fid("name-error") : undefined}
              required
            />
            <FieldError id={fid("name-error")} message={errors.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={fid("email")}>E-mail</Label>
            <Input
              id={fid("email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? fid("email-error") : undefined}
              required
            />
            <FieldError id={fid("email-error")} message={errors.email} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={fid("password")}>Senha</Label>
            <Input
              id={fid("password")}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? fid("password-error") : fid("password-hint")}
              required
            />
            {errors.password ? (
              <FieldError id={fid("password-error")} message={errors.password} />
            ) : (
              <p id={fid("password-hint")} className="text-xs text-muted-foreground">
                Mínimo de 8 caracteres.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
                aria-invalid={Boolean(errors.adult)}
                aria-describedby={errors.adult ? fid("adult-error") : undefined}
              />
              <span>Confirmo que tenho 18 anos ou mais.</span>
            </label>
            <FieldError id={fid("adult-error")} message={errors.adult} />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" aria-hidden />}
            Criar conta
          </Button>
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
