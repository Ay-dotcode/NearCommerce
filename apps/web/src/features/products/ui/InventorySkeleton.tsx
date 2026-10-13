import { Skeleton, SkeletonGroup } from "@nearcommerce/ui";

// Placeholder for the inventory table. Rows use the same paddings, 40px thumbnail and column
// layout as the real rows so the table does not jump when products arrive.
export function ProductsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup
      label="Inventory"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
    >
      <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="ml-auto hidden h-4 w-12 sm:block" />
        <Skeleton className="hidden h-4 w-16 sm:block" />
        <Skeleton className="hidden h-4 w-20 lg:block" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="hidden h-5 w-16 sm:block" />
            <Skeleton className="hidden h-5 w-10 sm:block" />
            <Skeleton className="hidden h-5 w-24 lg:block" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

// Whole-page placeholder for the inventory screen: heading, summary tiles, filters and table,
// each sized like the real thing.
export function InventoryPageSkeleton() {
  return (
    <SkeletonGroup label="Inventory" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <li
            key={i}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1.5 h-8 w-10" />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-48" />
      </div>
      <ProductsTableSkeleton />
    </SkeletonGroup>
  );
}
