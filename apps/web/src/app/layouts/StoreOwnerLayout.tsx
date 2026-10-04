import { parseApiError } from "@/api/errors";
import { listMyStores } from "@/api/stores";
import { Button } from "@/components/ui";
import { MY_STORES_KEY } from "@/constants";
import { AppRoutes, STORE_KEY } from "@/constants/routes";
import { clearSession, setActiveStoreId } from "@/features/auth/session";
import { SupportDialog } from "@/features/support/ui/SupportDialog";
import { cn } from "@/lib/cn";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navItems = [
  { to: AppRoutes.storeOwnerDashboard, label: "Inventory" },
  { to: AppRoutes.storeProfile, label: "Store settings" },
];

export function StoreOwnerLayout() {
  const navigate = useNavigate();
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
    clearSession();
    navigate(AppRoutes.login, { replace: true });
  };

  const ready = Boolean(storesQuery.data && activeStore);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-xs font-semibold text-brand-700">
                NearCommerce
              </p>
              <h1 className="text-lg font-semibold leading-tight">
                Store Owner Portal
              </h1>
            </div>

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

        {ready && (
          <nav
            aria-label="Primary"
            className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6"
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
          This store is suspended and hidden from search. Contact support for
          assistance.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {storesQuery.isLoading && (
          <p className="text-sm text-slate-500">Loading your stores…</p>
        )}

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

        {ready && <Outlet key={activeStore!.id} />}
      </main>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
