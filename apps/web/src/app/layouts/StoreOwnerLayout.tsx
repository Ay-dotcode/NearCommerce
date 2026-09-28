import { AppRoutes, STORE_KEY } from "@/constants/routes";
import { clearSession } from "@/features/auth/session";
import { httpClient } from "@nearcommerce/api";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

type Store = { id: string; name: string; is_suspended: boolean };
type Status = "loading" | "ready" | "error";

export function StoreOwnerLayout() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState(
    "Couldn't load your stores.",
  );

  const load = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    httpClient
      .get<{ data: Store[] }>("/stores/mine")
      .then((res) => {
        if (cancelled) return;
        const owned = res.data.data;
        if (owned.length === 0) {
          localStorage.removeItem(STORE_KEY);
          navigate(AppRoutes.onboarding, { replace: true });
          return;
        }
        const saved = localStorage.getItem(STORE_KEY);
        const active = owned.find((s) => s.id === saved) ?? owned[0];
        localStorage.setItem(STORE_KEY, active.id);
        setStores(owned);
        setSelectedStoreId(active.id);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const code = err?.response?.status;
        if (code === 401) {
          clearSession();
          navigate(AppRoutes.login, { replace: true });
          return;
        }
        setErrorMessage(
          code === 403
            ? (err.response?.data?.error ??
                "Your account can't access this portal.")
            : "Couldn't load your stores.",
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => load(), [load]);

  const handleSelectStore = (storeId: string) => {
    localStorage.setItem(STORE_KEY, storeId);
    setSelectedStoreId(storeId);
  };

  const signOut = () => {
    clearSession();
    navigate(AppRoutes.login, { replace: true });
  };

  const activeStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                NearCommerce
              </p>
              <h1 className="text-lg font-semibold">Store Owner Portal</h1>
            </div>

            {status === "ready" && (
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="store-switcher"
                  className="text-sm font-medium text-slate-600"
                >
                  Active Store:
                </label>
                <select
                  id="store-switcher"
                  value={selectedStoreId}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.is_suspended ? " (suspended)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => navigate(AppRoutes.onboarding)}
                  className="rounded border border-blue-600 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  + Add Store
                </button>
              </div>
            )}
          </div>

          <button
            onClick={signOut}
            className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {status === "ready" && activeStore?.is_suspended && (
        <div className="bg-red-50 px-6 py-3 text-center text-sm text-red-800">
          This store is suspended and hidden from search. Contact support for
          assistance.
        </div>
      )}

      <main className="mx-auto max-w-7xl">
        {status === "loading" && (
          <p className="p-6 text-sm text-slate-500">Loading your stores…</p>
        )}
        {status === "error" && (
          <div className="p-6 text-sm">
            <p className="mb-2 text-red-700">{errorMessage}</p>
            <button
              onClick={load}
              className="rounded border border-slate-300 px-3 py-1.5 hover:bg-white"
            >
              Retry
            </button>
          </div>
        )}
        {status === "ready" && <Outlet key={selectedStoreId} />}
      </main>
    </div>
  );
}
