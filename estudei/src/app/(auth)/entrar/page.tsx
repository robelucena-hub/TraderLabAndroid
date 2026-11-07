import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <LoginForm />
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ambiente de desenvolvimento: rode o seed e entre com <span className="font-medium">demo@estudei.app</span> /{" "}
          <span className="font-medium">estudei123</span>.
        </p>
      )}
    </>
  );
}
