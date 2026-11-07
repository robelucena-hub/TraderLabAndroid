import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { DesktopNav, MobileNav } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/session";

/** Reads the session, so it streams in behind a Suspense boundary. */
async function CurrentUserMenu() {
  const user = await requireUser();
  return <UserMenu name={user.name} email={user.email} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo href="/painel" />
          <DesktopNav />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <CurrentUserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">{children}</main>
      <MobileNav />
    </div>
  );
}
