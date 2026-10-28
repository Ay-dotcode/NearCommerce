import { listMyStores } from "@/api/stores";
import { PortalPageSkeleton } from "@/app/PageSkeletons";
import {
  BrandIcon,
  Button,
  PageTransition,
  PointerGlow,
  Skeleton,
  ThemeToggle,
} from "@nearcommerce/ui";
import { MY_STORES_KEY } from "@/constants";
import { AppRoutes } from "@/constants/routes";
import {
  clearSession,
  setActiveStoreId,
  signOutEverywhere,
} from "@/features/auth/session";
import { OwnerTour } from "@/features/onboarding/OwnerTour";
import { useOwnerTour } from "@/features/onboarding/useOwnerTour";
import { SupportDialog } from "@/features/support/ui/SupportDialog";
import { parseApiError, STORE_KEY } from "@nearcommerce/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { cn } from "@nearcommerce/helpers";

const navItems = [
  { to: AppRoutes.storeOwnerDashboard, label: "Inventory" },
  { to: AppRoutes.storeProfile, label: "Store settings" },
];

export function StoreOwnerLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [supportOpen, setSupportOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(
    () => localStorage.getItem(STORE_KEY) ?? "",
  );

  const storesQuery = useQuery({
    queryKey: MY_STORES_KEY,
    queryFn: listMyStores,
    retry: false,
  });
  const stores = storesQuery.data ?? [];
  const activeStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0];

  // Keep the persisted X-Store-ID in sync with what the account actually owns.
  useEffect(() => {
    if (!storesQuery.data) return;
    if (storesQuery.data.length === 0) {
      localStorage.removeItem(STORE_KEY);
      navigate(AppRoutes.onboarding, { replace: true });
      return;
    }
    if (activeStore && activeStore.id !== selectedStoreId)
      setSelectedStoreId(activeStore.id);
    if (activeStore && localStorage.getItem(STORE_KEY) !== activeStore.id)
      setActiveStoreId(activeStore.id);
  }, [storesQuery.data, activeStore, selectedStoreId, navigate]);

  const error = storesQuery.isError ? parseApiError(storesQuery.error) : null;
  useEffect(() => {
    if (error?.status === 401) {
      clearSession();
      navigate(AppRoutes.login, { replace: true });
    }
  }, [error?.status, navigate]);

  const handleSelectStore = (storeId: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreId(storeId);
  };

  const signOut = () => {
    void signOutEverywhere();
    navigate(AppRoutes.login, { replace: true });
  };

  const ready = Boolean(storesQuery.data && activeStore);
  // Shown once to a new owner, as soon as the page behind it has loaded.
  const tour = useOwnerTour(ready);

  return (
    <div className="relative min-h-screen text-slate-900">
      <PointerGlow />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* The icon and name take you back to the default page. */}
            <Link
              to={AppRoutes.storeOwnerDashboard}
              aria-label="Near Commerce home"
              className="press flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <BrandIcon size={36} className="rounded-xl" />
              <div>
                <p className="text-xs font-semibold text-brand-700">
                  Near Commerce
                </p>
                <h1 className="text-lg font-semibold leading-tight">
                  Store Owner Portal
                </h1>
              </div>
            </Link>

            {storesQuery.isLoading && (
              <Skeleton className="h-9 w-72 max-w-full" />
            )}

            {ready && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="store-switcher"
                  className="text-sm font-medium text-slate-600"
                >
                  Active store
                </label>
                <select
                  id="store-switcher"
                  value={activeStore!.id}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="h-9 max-w-[14rem] truncate rounded-md border border-slate-300 bg-white px-2 text-sm font-medium shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.is_suspended ? " (suspended)" : ""}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(AppRoutes.onboarding)}
                >
                  Add store
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Button variant="ghost" size="sm" onClick={tour.start}>
              Take the tour
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSupportOpen(true)}
            >
              Support
            </Button>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        {storesQuery.isLoading && (
          <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6">
            <Skeleton className="my-2.5 h-5 w-20" />
            <Skeleton className="my-2.5 ml-4 h-5 w-28" />
          </div>
        )}

        {ready && (
          <nav
            aria-label="Primary"
            className="no-scrollbar mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6"
          >
            <ul className="flex gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "-mb-px inline-block border-b-2 px-3 py-2.5 text-sm font-medium",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                        isActive
                          ? "border-brand-600 text-brand-700"
                          : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {ready && activeStore!.is_suspended && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800"
        >
          This store is suspended and hidden from search.{" "}
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Contact support
          </button>{" "}
          for assistance.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {storesQuery.isLoading && <PortalPageSkeleton />}

        {error && error.status !== 401 && (
          <div
            role="alert"
            className="max-w-xl rounded-lg border border-red-200 bg-white p-5"
          >
            <p className="font-medium text-red-800">
              {error.status === 403
                ? error.message
                : "We couldn't load your stores."}
            </p>
            {error.status !== 403 && (
              <Button
                className="mt-3"
                variant="secondary"
                size="sm"
                onClick={() => storesQuery.refetch()}
              >
                Try again
              </Button>
            )}
          </div>
        )}

        {ready && (
          <PageTransition transitionKey={`${activeStore!.id}${pathname}`}>
            <Outlet key={activeStore!.id} />
          </PageTransition>
        )}
      </main>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
      <OwnerTour open={tour.open} onClose={tour.finish} />
    </div>
  );
}
