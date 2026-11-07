import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  /** Optional band colour dot (e.g. red for the critical count). */
  dotClassName?: string;
}

export function StatTile({ label, value, hint, icon: Icon, dotClassName }: StatTileProps) {
  return (
    <Card className="gap-1 px-4 py-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {dotClassName && <span className={cn("size-2.5 rounded-full", dotClassName)} aria-hidden />}
          {label}
        </span>
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
