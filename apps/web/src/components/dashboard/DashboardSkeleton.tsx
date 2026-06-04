import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => (
  <div className="space-y-4">
    {/* KPI row */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dash-card flex min-h-[96px] overflow-hidden">
          <div className="w-[3px] shrink-0 rounded-l-[var(--dash-card-radius)] bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
    {/* Chart row */}
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="dash-card space-y-3 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      ))}
    </div>
    {/* Bottom row */}
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="dash-card space-y-3 p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-44 w-full rounded-lg" />
      </div>
      <div className="dash-card space-y-2 p-4">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  </div>
);
