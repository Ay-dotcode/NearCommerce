import {
  confirmProductStock,
  getStoreProducts,
  StoreProduct,
} from "@/api/products";
import CsvImporter from "@/components/store-owner/CsvImporter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const isStale = (date: string) =>
  Date.now() - new Date(date).getTime() > 30 * 24 * 60 * 60 * 1000;

export default function StoreOwnerDashboard() {
  const queryClient = useQueryClient();
  const storeId = localStorage.getItem("X-Store-ID");
  const productsQuery = useQuery({
    queryKey: ["store-products", storeId],
    queryFn: getStoreProducts,
    enabled: Boolean(storeId),
  });
  const confirmStock = useMutation({
    mutationFn: confirmProductStock,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] }),
  });

  if (!storeId)
    return (
      <div className="p-6 text-red-600">
        No store is assigned to this account.
      </div>
    );
  if (productsQuery.isLoading)
    return <div className="p-6 text-slate-500">Loading inventory...</div>;
  if (productsQuery.isError)
    return <div className="p-6 text-red-600">Failed to load inventory.</div>;

  const products = productsQuery.data ?? [];
  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-blue-600">
            Inventory
          </p>
          <h2 className="text-2xl font-bold">Your products</h2>
        </div>
        <CsvImporter />
      </div>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-slate-500">
          No products found. Import a CSV to get started.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product: StoreProduct) => {
            const stale = product.isStale ?? isStale(product.last_verified_at);
            return (
              <article
                key={product.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <span
                    className={
                      product.is_published
                        ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
                        : "rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800"
                    }
                  >
                    {product.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-2 text-slate-600">
                  Quantity: {product.quantity}
                </p>
                {stale && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    Unverified for more than 30 days
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => confirmStock.mutate(product.id)}
                  disabled={confirmStock.isPending}
                  className="mt-5 w-full rounded bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {confirmStock.isPending
                    ? "Verifying..."
                    : "Confirm Still In Stock"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
