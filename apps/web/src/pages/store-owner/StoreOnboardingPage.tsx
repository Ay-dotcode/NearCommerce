import { createStore } from "@/api/stores";
import {
  BackButton,
  BrandIcon,
  PointerGlow,
  ThemeToggle,
  useToast,
} from "@nearcommerce/ui";
import { MY_STORES_KEY } from "@/constants";
import { AppRoutes } from "@/constants/routes";
import { setActiveStoreId } from "@/features/auth/session";
import { StoreForm } from "@/forms/StoreForm";
import { STORE_KEY } from "@nearcommerce/api";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

export function StoreOnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const hasStores = Boolean(localStorage.getItem(STORE_KEY));

  return (
    <div className="relative min-h-screen">
      <PointerGlow />
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link
            to={AppRoutes.storeOwnerDashboard}
            aria-label="Near Commerce home"
            className="hover-outline press flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <BrandIcon size={28} className="rounded-lg" />
            <p className="text-xs font-semibold text-brand-700">Near Commerce</p>
          </Link>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {hasStores && (
          <BackButton fallback={AppRoutes.storeOwnerDashboard} className="mb-3" />
        )}
        <h1 className="text-2xl font-semibold text-slate-900">
          {hasStores ? "Add another store" : "Set up your store"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Add the basics now. You can change anything later in Store settings.
          Shoppers find you once you publish products.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <StoreForm
            submitLabel="Create store"
            onCancel={
              hasStores
                ? () => navigate(AppRoutes.storeOwnerDashboard)
                : undefined
            }
            onSubmit={async (payload) => {
              const store = await createStore(payload);
              setActiveStoreId(store.id);
              await queryClient.invalidateQueries({ queryKey: MY_STORES_KEY });
              toast.success(
                `${store.name} is ready. Add your first products next.`,
              );
              navigate(AppRoutes.storeOwnerDashboard, { replace: true });
            }}
          />
        </div>
      </main>
    </div>
  );
}
