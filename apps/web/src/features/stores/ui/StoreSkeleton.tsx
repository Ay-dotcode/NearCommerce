import { Skeleton, SkeletonGroup } from "@nearcommerce/ui";

function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className={tall ? "h-[4.75rem] w-full" : "h-10 w-full"} />
    </div>
  );
}

// Placeholder shaped like the store settings page: heading, the store form card (details,
// location, seven opening-hours rows) and the delete-store card.
export function StoreSettingsSkeleton() {
  return (
    <SkeletonGroup label="Store settings" className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="space-y-8 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <FieldSkeleton />
          <FieldSkeleton tall />
          <FieldSkeleton />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-2.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-9 w-[7.5rem]" />
                <Skeleton className="h-9 w-[7.5rem]" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
