import { listCategories } from "@/api/categories";
import {
  confirmProductStock,
  deleteProduct,
  listProducts,
} from "@/api/products";
import CsvImporter from "@/components/store-owner/CsvImporter";
import { CATEGORIES_KEY, PRODUCTS_KEY } from "@/constants";
import { applyVerified } from "@/helpers/productCache";
import { Badge, Button, ConfirmDialog, EmptyState, Modal, Skeleton, useDebouncedValue, useToast } from "@nearcommerce/ui";
import { CategoryChips } from "@/features/products/ui/CategoryChips";
import {
  ProductsGridSkeleton,
  ProductsTableSkeleton,
} from "@/features/products/ui/InventorySkeleton";
import { ProductDetailsModal } from "@/features/products/ui/ProductDetailsModal";
import { ProductGrid } from "@/features/products/ui/ProductGrid";
import { ProductImage } from "@/features/products/ui/ProductImage";
import { ViewToggle } from "@/features/products/ui/ViewToggle";
import { ProductForm } from "@/forms/ProductForm";
import type {
  InventoryView,
  ProductListResponse,
  ProductStatusFilter,
  ProductSummary,
  StoreProduct,
} from "@/types/products";
import { parseApiError, STORE_KEY } from "@nearcommerce/api";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cn, formatPrice, timeAgo } from "@nearcommerce/helpers";
import { isStale } from "@/helpers/products";

const PAGE_SIZE = 25;
const VIEW_STORAGE_KEY = "nc-inventory-view";

// The owner's last layout choice is remembered on this device. Storage can be unavailable
// (private mode, blocked cookies), so any failure falls back to the table.
function readStoredView(): InventoryView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

type Editor = { mode: "create" } | { mode: "edit"; product: StoreProduct };

const STATUS_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "stale", label: "Needs verification" },
];

export default function StoreOwnerDashboard() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const storeId = localStorage.getItem(STORE_KEY);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [view, setView] = useState<InventoryView>(readStoredView);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<StoreProduct | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const params = {
    q: debouncedSearch,
    status,
    categoryId,
    page,
    pageSize: PAGE_SIZE,
  };
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
  const viewing = products.find((p) => p.id === viewingId) ?? null;
  const meta = productsQuery.data?.meta;
  const summary: ProductSummary | undefined = meta?.summary;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? products.length;
  const filtersActive =
    debouncedSearch !== "" || status !== "all" || categoryId !== "";

  // Deleting the last item on the final page leaves us past the end: step back.
  useEffect(() => {
    if (meta && page > meta.totalPages && meta.totalPages >= 1)
      setPage(meta.totalPages);
  }, [meta, page]);

  // Refetch every cached inventory list (not only the one on screen) so counts such as the
  // "needs verification" banner never come back from a stale cache after a filter change.
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: PRODUCTS_KEY,
      refetchType: "active",
    });
    // The lists for other filters refetch quietly in the background.
    void queryClient.invalidateQueries({
      queryKey: PRODUCTS_KEY,
      refetchType: "inactive",
    });
  };

  const confirmStock = useMutation({
    mutationFn: confirmProductStock,
    onSuccess: async (_data, productId) => {
      // Update the screen straight away; the refetch below then confirms the real numbers.
      const target = products.find((p) => p.id === productId);
      const verifiedAt = new Date().toISOString();
      queryClient.setQueriesData<ProductListResponse>(
        { queryKey: PRODUCTS_KEY },
        (old) =>
          applyVerified(
            old,
            productId,
            target ? isStale(target) : false,
            verifiedAt,
          ),
      );
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
    setCategoryId("");
    setPage(1);
  };

  const chooseCategory = (next: string) => {
    setCategoryId(next);
    setPage(1);
  };

  const chooseView = (next: InventoryView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Not remembered, but the switch itself still works.
    }
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
                  "w-full cursor-pointer rounded-xl border bg-white px-4 py-3 text-left shadow-card transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  status === tile.key
                    ? "border-brand-500 ring-2 ring-brand-500"
                    : "border-slate-200 hover:border-brand-500 hover:ring-2 hover:ring-brand-500/30 hover:shadow-md",
                )}
              >
                <span className="block text-xs font-medium text-slate-500">
                  {tile.label}
                </span>
                {tile.value === undefined && productsQuery.isLoading ? (
                  <Skeleton className="mt-1 h-8 w-10" />
                ) : (
                  <span className="mt-0.5 block text-2xl font-semibold tabular-nums">
                    {tile.value ?? "–"}
                  </span>
                )}
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
        <ViewToggle value={view} onChange={chooseView} />
      </div>

      <CategoryChips
        categories={categoriesQuery.data}
        counts={summary?.categories}
        total={summary?.total}
        selected={categoryId}
        onSelect={chooseCategory}
      />

      {productsQuery.isLoading &&
        (view === "grid" ? <ProductsGridSkeleton /> : <ProductsTableSkeleton />)}

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
              description="Try a different search, status or category."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </>
      )}

      {products.length > 0 && view === "grid" && (
        <ProductGrid
          products={products}
          categories={categoriesQuery.data}
          dimmed={productsQuery.isPlaceholderData}
          confirmingId={confirmStock.isPending ? confirmStock.variables : null}
          confirmDisabled={confirmStock.isPending}
          onView={(product) => setViewingId(product.id)}
          onEdit={(product) => setEditor({ mode: "edit", product })}
          onDelete={setDeleting}
          onConfirmStock={(product) => confirmStock.mutate(product.id)}
        />
      )}

      {products.length > 0 && view === "list" && (
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
                  <tr
                    key={product.id}
                    className="cursor-pointer align-top hover:bg-slate-50"
                    onClick={(e) => {
                      // Row click opens details, except for clicks on its own buttons.
                      if (!(e.target as HTMLElement).closest("button, a"))
                        setViewingId(product.id);
                    }}
                  >
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-start gap-3">
                        <ProductImage
                          src={product.image_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md border border-slate-200"
                          imgClassName="object-cover"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setViewingId(product.id)}
                            aria-label={`View details: ${product.name}`}
                            className="block max-w-full truncate rounded text-left font-medium text-slate-900 hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            {product.name}
                          </button>
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

      <ProductDetailsModal
        product={viewing}
        categories={categoriesQuery.data}
        stale={viewing ? isStale(viewing) : false}
        confirming={
          confirmStock.isPending && confirmStock.variables === viewing?.id
        }
        onClose={() => setViewingId(null)}
        onEdit={(product) => {
          setViewingId(null);
          setEditor({ mode: "edit", product });
        }}
        onConfirmStock={(product) => confirmStock.mutate(product.id)}
      />

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
