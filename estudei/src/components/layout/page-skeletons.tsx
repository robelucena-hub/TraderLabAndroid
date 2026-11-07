import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Carregando painel">
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-xl" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Carregando tópico">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[520px] rounded-xl" />
        <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Carregando formulário">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
