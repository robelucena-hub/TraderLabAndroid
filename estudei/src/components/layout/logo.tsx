import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M6 9c3 0 4 9 7 9 1.6 0 1.8-5 4-5 2.6 0 3 6 6 6 1.6 0 2.4-1.6 3-2.4"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="16.6" r="2.4" fill="var(--band-attention)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}>
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">ESTUDEI</span>
    </Link>
  );
}
