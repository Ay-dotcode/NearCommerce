import { Skeleton, SkeletonGroup } from "@nearcommerce/ui";

function HeadingSkeleton({ withActions = false }: { withActions?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-56" />
      </div>
      {withActions && (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-28" />
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({
  columns = 5,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TablePageSkeleton({
  label,
  columns,
  withActions = false,
}: {
  label: string;
  columns?: number;
  withActions?: boolean;
}) {
  return (
    <SkeletonGroup label={label}>
      <HeadingSkeleton withActions={withActions} />
      <TableSkeleton columns={columns} />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Platform metrics">
      <HeadingSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card xl:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}

export function AdminShellSkeleton() {
  return (
    <SkeletonGroup label="Admin console" className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-44" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <DashboardSkeleton />
      </div>
    </SkeletonGroup>
  );
}

export function CategoriesSkeleton() {
  return (
    <SkeletonGroup label="Categories" className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="mt-4 divide-y divide-slate-200 rounded border border-slate-200">
            {[0, 1, 2].map((r) => (
              <div
                key={r}
                className="flex items-center justify-between px-3 py-2"
              >
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

export function CardListSkeleton({
  label,
  count = 4,
  className = "space-y-3",
}: {
  label: string;
  count?: number;
  className?: string;
}) {
  return (
    <SkeletonGroup label={label} className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
