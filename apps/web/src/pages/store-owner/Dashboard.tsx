import { CATEGORIES_KEY, listCategories } from "@/api/categories";
import { parseApiError } from "@/api/errors";
import {
  PRODUCTS_KEY,
  confirmProductStock,
  deleteProduct,
  listProducts,
} from "@/api/products";
import CsvImporter from "@/components/store-owner/CsvImporter";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  useToast,
} from "@/components/ui";
import { STORE_KEY } from "@/constants/routes";
import { formatPrice, timeAgo } from "@/features/products/lib/format";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ProductForm } from "@/pages/owner/ProductForm";
import type {
  ProductStatusFilter,
  ProductSummary,
  StoreProduct,
} from "@/types/products";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

const PAGE_SIZE = 25;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type Editor = { mode: "create" } | { mode: "edit"; product: StoreProduct };

const STATUS_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "stale", label: "Needs verification" },
];

const isStale = (p: StoreProduct) =>
  p.isStale ??
  Date.now() - new Date(p.last_verified_at).getTime() > THIRTY_DAYS_MS;

export default function StoreOwnerDashboard() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const storeId = localStorage.getItem(STORE_KEY);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<StoreProduct | null>(null);

  const params = { q: debouncedSearch, status, page, pageSize: PAGE_SIZE };
  const productsQuery = useQuery({
    queryKey: [...PRODUCTS_KEY, storeId, params],
    queryFn: () => listProducts(params),
    enabled: Boolean(storeId),
    placeholderData: keepPreviousData,
  });

  // Optional: the form still works (without a category picker) if this fails to load.
  const categoriesQuery = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: listCategories,
    enabled: Boolean(storeId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const products = productsQuery.data?.data ?? [];
  const meta = productsQuery.data?.meta;
  const summary: ProductSummary | undefined = meta?.summary;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? products.length;
  const filtersActive = debouncedSearch !== "" || status !== "all";

  // Deleting the last item on the final page leaves us past the end: step back.
  useEffect(() => {
    if (meta && page > meta.totalPages && meta.totalPages >= 1)
      setPage(meta.totalPages);
  }, [meta, page]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });

  const confirmStock = useMutation({
    mutationFn: confirmProductStock,
    onSuccess: async () => {
      await refresh();
      toast.success("Stock confirmed");
    },
    onError: (error) =>
      toast.error(
        parseApiError(error, "We couldn't confirm that product. Try again.")
          .message,
      ),
  });

  const removeProduct = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      const name = deleting?.name;
      setDeleting(null);
      await refresh();
      toast.success(name ? `Deleted ${name}` : "Product deleted");
    },
    onError: (error) => {
      setDeleting(null);
      toast.error(
        parseApiError(error, "We couldn't delete that product. Try again.")
          .message,
      );
    },
  });

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  const chooseStatus = (next: ProductStatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  if (!storeId)
    return (
      <EmptyState
        title="No store selected"
        description="Create a store first, then you can manage its products here."
      />
    );

  const tiles: { key: ProductStatusFilter; label: string; value?: number }[] = [
    { key: "all", label: "Total products", value: summary?.total },
    { key: "published", label: "Published", value: summary?.published },
    { key: "draft", label: "Drafts", value: summary?.drafts },
    { key: "out_of_stock", label: "Out of stock", value: summary?.outOfStock },
    { key: "stale", label: "Needs verification", value: summary?.stale },
  ];

  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventory</h2>
          <p className="mt-1 text-sm text-slate-600">
            Keep stock accurate so shoppers can trust what they see.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvImporter />
          <Button onClick={() => setEditor({ mode: "create" })}>
            Add product
          </Button>
        </div>
      </div>

      <section aria-label="Inventory summary">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile) => (
            <li key={tile.key}>
              <button
                type="button"
                aria-pressed={status === tile.key}
                onClick={() => chooseStatus(tile.key)}
                className={cn(
                  "w-full rounded-xl border bg-white px-4 py-3 text-left shadow-card transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  status === tile.key
                    ? "border-brand-500 ring-1 ring-brand-500"
                    : "border-slate-200 hover:border-slate-300",
                )}
              >
                <span className="block text-xs font-medium text-slate-500">
                  {tile.label}
                </span>
                <span className="mt-0.5 block text-2xl font-semibold tabular-nums">
                  {tile.value ?? "–"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {summary && summary.stale > 0 && status !== "stale" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            {summary.stale} product
            {summary.stale === 1 ? " hasn't" : "s haven't"} been verified
            recently. Shoppers see stale stock levels as less reliable.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => chooseStatus("stale")}
          >
            Review them
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or description"
            className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-card placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div>
          <label htmlFor="product-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="product-status"
            value={status}
            onChange={(e) =>
              chooseStatus(e.target.value as ProductStatusFilter)
            }
            className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-48"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {productsQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading inventory…</p>
      )}

      {productsQuery.isError && (
        <div
          role="alert"
          className="max-w-xl rounded-lg border border-red-200 bg-white p-5"
        >
          <p className="font-medium text-red-800">
            {
              parseApiError(productsQuery.error, "Failed to load inventory.")
                .message
            }
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            size="sm"
            onClick={() => productsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      )}

      {productsQuery.isSuccess && products.length === 0 && (
        <>
          {!filtersActive && (summary?.total ?? 0) === 0 ? (
            <EmptyState
              title="No products yet"
              description="Add your first product, or import many at once from a CSV file. Products with an image URL are published straight away; the rest are saved as drafts."
              action={
                <Button onClick={() => setEditor({ mode: "create" })}>
                  Add product
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No products match your filters"
              description="Try a different search or status."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </>
      )}

      {products.length > 0 && (
        <div
          className={cn(
            "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card",
            productsQuery.isPlaceholderData && "opacity-60",
          )}
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your products</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Product
                </th>
                <th
                  scope="col"
                  className="hidden px-4 py-3 text-right sm:table-cell"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="hidden px-4 py-3 text-right sm:table-cell"
                >
                  Quantity
                </th>
                <th scope="col" className="hidden px-4 py-3 lg:table-cell">
                  Verified
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const stale = isStale(product);
                const confirming =
                  confirmStock.isPending &&
                  confirmStock.variables === product.id;
                return (
                  <tr key={product.id} className="align-top">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-start gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            loading="lazy"
                            className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="h-10 w-10 shrink-0 rounded-md bg-slate-100"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 sm:hidden">
                            Qty {product.quantity} ·{" "}
                            {formatPrice(product.price)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge
                              tone={
                                product.is_published ? "success" : "warning"
                              }
                            >
                              {product.is_published ? "Published" : "Draft"}
                            </Badge>
                            {product.quantity === 0 && (
                              <Badge tone="danger">Out of stock</Badge>
                            )}
                            {stale && (
                              <Badge tone="warning">Needs verification</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </th>
                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                      {formatPrice(product.price)}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                      {product.quantity}
                    </td>
                    <td
                      className="hidden px-4 py-3 text-slate-600 lg:table-cell"
                      title={new Date(
                        product.last_verified_at,
                      ).toLocaleString()}
                    >
                      {timeAgo(product.last_verified_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant={stale ? "primary" : "secondary"}
                          loading={confirming}
                          disabled={confirmStock.isPending}
                          aria-label={`Confirm still in stock: ${product.name}`}
                          onClick={() => confirmStock.mutate(product.id)}
                        >
                          {confirming ? "Verifying…" : "Confirm still in stock"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${product.name}`}
                          onClick={() => setEditor({ mode: "edit", product })}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setDeleting(product)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {products.length > 0 && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"
        >
          <p>
            Showing {firstShown}–{lastShown} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span aria-live="polite">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "edit" ? "Edit product" : "Add product"}
        size="lg"
      >
        {editor && (
          <ProductForm
            storeId={storeId}
            product={editor.mode === "edit" ? editor.product : undefined}
            categories={categoriesQuery.data}
            onCancel={() => setEditor(null)}
            onSuccess={async () => {
              const wasEdit = editor.mode === "edit";
              setEditor(null);
              await refresh();
              toast.success(wasEdit ? "Product updated" : "Product added");
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this product?"
        description={
          deleting
            ? `"${deleting.name}" will be removed from your store and from shoppers' search results. This can't be undone.`
            : ""
        }
        confirmLabel="Delete product"
        loading={removeProduct.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && removeProduct.mutate(deleting.id)}
      />
    </div>
  );
}
