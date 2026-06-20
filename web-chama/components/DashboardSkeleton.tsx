import { Skeleton } from "./ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-56 rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-96 rounded-[var(--radius-card)] lg:col-span-7" />
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Skeleton className="h-64 rounded-[var(--radius-card)]" />
          <Skeleton className="h-48 rounded-[var(--radius-card)]" />
        </div>
      </div>
    </div>
  );
}
