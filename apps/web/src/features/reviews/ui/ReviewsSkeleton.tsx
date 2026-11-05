import { Skeleton, SkeletonGroup } from "@nearcommerce/ui";

export function ReviewsPageSkeleton() {
  return (
    <SkeletonGroup label="Reviews" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
