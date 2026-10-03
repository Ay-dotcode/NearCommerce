import { MY_STORES_KEY, createStore } from "@/api/stores";
import { useToast } from "@/components/ui";
import { AppRoutes, STORE_KEY } from "@/constants/routes";
import { setActiveStoreId } from "@/features/auth/session";
import { StoreForm } from "@/features/stores/ui/StoreForm";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export function StoreOnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const hasStores = Boolean(localStorage.getItem(STORE_KEY));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <p className="text-xs font-semibold text-brand-700">NearCommerce</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">{hasStores ? "Add another store" : "Set up your store"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add the basics now. You can change anything later in Store settings. Shoppers find you once you publish products.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <StoreForm
            submitLabel="Create store"
            onCancel={hasStores ? () => navigate(AppRoutes.storeOwnerDashboard) : undefined}
            onSubmit={async (payload) => {
              const store = await createStore(payload);
              setActiveStoreId(store.id);
              await queryClient.invalidateQueries({ queryKey: MY_STORES_KEY });
              toast.success(`${store.name} is ready. Add your first products next.`);
              navigate(AppRoutes.storeOwnerDashboard, { replace: true });
            }}
          />
        </div>
      </main>
    </div>
  );
}
