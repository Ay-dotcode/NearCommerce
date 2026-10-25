import { Badge, Button } from "@nearcommerce/ui";
import { ProductImage } from "@/features/products/ui/ProductImage";
import type { Category } from "@/types/categories";
import type { StoreProduct } from "@/types/products";
import { categoryLabel, isStale } from "@/helpers/products";
import { cn, formatPrice, timeAgo } from "@nearcommerce/helpers";

interface Props {
  products: StoreProduct[];
  categories?: Category[];
  // Dims the grid while the next page or filter loads.
  dimmed?: boolean;
  confirmingId?: string | null;
  confirmDisabled?: boolean;
  onView: (product: StoreProduct) => void;
  onEdit: (product: StoreProduct) => void;
  onDelete: (product: StoreProduct) => void;
  onConfirmStock: (product: StoreProduct) => void;
}

// The inventory as photo cards. Same actions and badges as the table rows; clicking the photo
// or name opens the details dialog.
export function ProductGrid({
  products,
  categories,
  dimmed,
  confirmingId,
  confirmDisabled,
  onView,
  onEdit,
  onDelete,
  onConfirmStock,
}: Props) {
  return (
    <ul
      aria-label="Your products"
      className={cn(
        "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        dimmed && "opacity-60",
      )}
    >
      {products.map((product) => {
        const stale = isStale(product);
        const confirming = confirmingId === product.id;
        const category = categoryLabel(product, categories);
        return (
          <li
            key={product.id}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
          >
            <button
              type="button"
              onClick={() => onView(product)}
              aria-label={`View details: ${product.name}`}
              className="block cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
            >
              <ProductImage
                src={product.image_url}
                alt=""
                className="aspect-square w-full"
                imgClassName="object-cover"
              />
            </button>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onView(product)}
                  className="block max-w-full truncate rounded text-left font-medium text-slate-900 hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  title={product.name}
                >
                  {product.name}
                </button>
                {category && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {category}
                  </p>
                )}
              </div>
              <p className="flex items-baseline justify-between text-sm">
                <span className="font-semibold tabular-nums">
                  {formatPrice(product.price)}
                </span>
                <span
                  className="text-xs text-slate-500 tabular-nums"
                  title={new Date(product.last_verified_at).toLocaleString()}
                >
                  Qty {product.quantity} · {timeAgo(product.last_verified_at)}
                </span>
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge tone={product.is_published ? "success" : "warning"}>
                  {product.is_published ? "Published" : "Draft"}
                </Badge>
                {product.quantity === 0 && (
                  <Badge tone="danger">Out of stock</Badge>
                )}
                {stale && <Badge tone="warning">Needs verification</Badge>}
              </div>
              <div className="mt-auto flex flex-wrap gap-1 pt-1">
                <Button
                  size="sm"
                  variant={stale ? "primary" : "secondary"}
                  className="flex-1"
                  loading={confirming}
                  disabled={confirmDisabled}
                  aria-label={`Confirm still in stock: ${product.name}`}
                  onClick={() => onConfirmStock(product)}
                >
                  {confirming ? "Verifying…" : "Confirm still in stock"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${product.name}`}
                  onClick={() => onEdit(product)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50"
                  aria-label={`Delete ${product.name}`}
                  onClick={() => onDelete(product)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
