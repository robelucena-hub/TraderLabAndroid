"use client";

import { CalendarCheckIcon, LayoutDashboardIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/painel", label: "Painel", icon: LayoutDashboardIcon },
  { href: "/revisoes", label: "Revisões", icon: CalendarCheckIcon },
  { href: "/topicos/novo", label: "Novo tópico", icon: PlusIcon },
] as const;

type Variant = "desktop" | "mobile";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || (href !== "/topicos/novo" && pathname.startsWith(`${href}/`));
}

/** Pure list of links; `pathname` is null while the current URL is not known yet. */
function NavList({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  if (variant === "desktop") {
    return (
      <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              "aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground aria-[current=page]:text-primary"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ActiveNav({ variant }: { variant: Variant }) {
  return <NavList variant={variant} pathname={usePathname()} />;
}

/**
 * The URL of dynamic routes (/topicos/[id]) is only known at request time, so
 * the active-link highlight streams in; the links themselves render instantly.
 */
function Nav({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<NavList variant={variant} pathname={null} />}>
      <ActiveNav variant={variant} />
    </Suspense>
  );
}

/** Horizontal navigation shown in the header on larger screens. */
export function DesktopNav() {
  return <Nav variant="desktop" />;
}

/** Bottom tab bar on phones. */
export function MobileNav() {
  return <Nav variant="mobile" />;
}
