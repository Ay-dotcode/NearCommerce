import { parseApiError } from "@/api/errors";
import { MY_STORES_KEY, deleteStore, getStore, updateStore } from "@/api/stores";
import { Button, ConfirmDialog, useToast } from "@/components/ui";
import { AppRoutes, STORE_KEY } from "@/constants/routes";
import { StoreForm } from "@/features/stores/ui/StoreForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const StoreProfile = ({ storeId: storeIdProp }: { storeId?: string }) => {
  const storeId = storeIdProp ?? localStorage.getItem(STORE_KEY) ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const storeQuery = useQuery({ queryKey: ["store", storeId], queryFn: () => getStore(storeId), enabled: Boolean(storeId) });

  const removeStore = useMutation({
    mutationFn: () => deleteStore(storeId),
    onSuccess: async () => {
      localStorage.removeItem(STORE_KEY);
      queryClient.removeQueries({ queryKey: ["store", storeId] });
      await queryClient.invalidateQueries({ queryKey: MY_STORES_KEY });
      toast.success("Store deleted.");
      setConfirmingDelete(false);
      navigate(AppRoutes.storeOwnerDashboard, { replace: true });
    },
    onError: (err) => {
      toast.error(parseApiError(err, "We couldn't delete the store.").message);
      setConfirmingDelete(false);
    },
  });

  if (!storeId) return <p className="text-sm text-red-700">No store is selected.</p>;
  if (storeQuery.isLoading) return <p className="text-sm text-slate-500">Loading store settings…</p>;
  if (storeQuery.isError || !storeQuery.data)
    return (
      <div role="alert" className="max-w-xl rounded-lg border border-red-200 bg-white p-5">
        <p className="font-medium text-red-800">We couldn&apos;t load this store.</p>
        <Button className="mt-3" variant="secondary" size="sm" onClick={() => storeQuery.refetch()}>
          Try again
        </Button>
      </div>
    );

  const store = storeQuery.data;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Store settings</h2>
        <p className="mt-1 text-sm text-slate-600">Update how {store.name} appears to shoppers.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <StoreForm
          key={`${store.id}:${store.updated_at ?? ""}`}
          initial={store}
          submitLabel="Save changes"
          onSubmit={async (payload) => {
            await updateStore(storeId, payload);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: MY_STORES_KEY }),
              queryClient.invalidateQueries({ queryKey: ["store", storeId] }),
            ]);
            toast.success("Store settings saved.");
          }}
        />
      </div>

      <section aria-labelledby="danger-zone-heading" className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
        <h3 id="danger-zone-heading" className="text-base font-semibold text-red-800">
          Delete store
        </h3>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Permanently removes this store and all of its products, along with shoppers&apos; favorites and reviews of it. This can&apos;t be undone.
        </p>
        <Button className="mt-4" variant="danger" onClick={() => setConfirmingDelete(true)}>
          Delete store
        </Button>
      </section>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${store.name}?`}
        description="All products in this store will be deleted permanently."
        confirmLabel="Delete store"
        requireText={store.name}
        loading={removeStore.isPending}
        onConfirm={() => removeStore.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
};
