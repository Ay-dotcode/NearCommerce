import { AppRoutes } from "@/constants/routes";
import { InventoryPageSkeleton } from "@/features/products/ui/InventorySkeleton";
import { StoreSettingsSkeleton } from "@/features/stores/ui/StoreSkeleton";
import { Skeleton, SkeletonGroup } from "@nearcommerce/ui";
import { useLocation } from "react-router-dom";

// Skeleton for whichever portal page the current URL points at, so the layout can show the
// right shape while the owner's stores load.
export function PortalPageSkeleton() {
  const { pathname } = useLocation();
  return pathname.startsWith(AppRoutes.storeProfile) ? (
    <StoreSettingsSkeleton />
  ) : (
    <InventoryPageSkeleton />
  );
}

// First paint of the app, before the router knows which page it is on: a header bar and a
// content card, matching the portal shell.
export function AppShellSkeleton() {
  return (
    <SkeletonGroup label="Page" className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <InventoryPageSkeleton />
      </div>
    </SkeletonGroup>
  );
}
