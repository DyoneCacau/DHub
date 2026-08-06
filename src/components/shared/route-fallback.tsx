import { Skeleton } from "@/components/ui/skeleton";

interface RouteFallbackProps {
  /** Quando true, assume área dentro do layout admin (sem preencher a viewport inteira). */
  embedded?: boolean;
}

export function RouteFallback({ embedded = true }: RouteFallbackProps) {
  return (
    <div
      className={
        embedded
          ? "mx-auto w-full max-w-7xl space-y-6"
          : "flex min-h-screen items-center justify-center bg-background p-6"
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Carregando página…</span>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="hidden h-24 w-full sm:block" />
        </div>
      </div>
    </div>
  );
}
