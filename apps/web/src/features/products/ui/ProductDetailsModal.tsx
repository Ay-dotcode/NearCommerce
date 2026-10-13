import { Badge, Button, formatPrice, Modal, timeAgo } from "@nearcommerce/ui";
import { ProductImage } from "@/features/products/ui/ProductImage";
import type { Category } from "@/types/categories";
import type { StoreProduct } from "@/types/products";

interface Props {
  product: StoreProduct | null;
  categories?: Category[];
  stale: boolean;
  confirming: boolean;
  onClose: () => void;
  onEdit: (product: StoreProduct) => void;
  onConfirmStock: (product: StoreProduct) => void;
}

function categoryLabel(product: StoreProduct, categories: Category[] = []) {
  if (!product.subcategory_id) return null;
  for (const category of categories) {
    const sub = category.subcategories.find(
      (s) => s.id === product.subcategory_id,
    );
    if (sub) return `${category.name} › ${sub.name}`;
  }
  return null;
}

// Full details for one product, with the photo shown large. Opened by clicking a product row.
export function ProductDetailsModal({
  product,
  categories,
  stale,
  confirming,
  onClose,
  onEdit,
  onConfirmStock,
}: Props) {
  const category = product ? categoryLabel(product, categories) : null;

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      title={product?.name ?? "Product"}
      size="xl"
      footer={
        product && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant={stale ? "primary" : "secondary"}
              loading={confirming}
              onClick={() => onConfirmStock(product)}
            >
              Confirm still in stock
            </Button>
            <Button onClick={() => onEdit(product)}>Edit product</Button>
          </>
        )
      }
    >
      {product && (
        <div className="space-y-5">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            className="h-[45vh] min-h-[16rem] w-full rounded-xl border border-slate-200"
            imgClassName="object-contain"
          />

          <div className="flex flex-wrap gap-1.5">
            <Badge tone={product.is_published ? "success" : "warning"}>
              {product.is_published ? "Published" : "Draft"}
            </Badge>
            {product.quantity === 0 && (
              <Badge tone="danger">Out of stock</Badge>
            )}
            {stale && <Badge tone="warning">Needs verification</Badge>}
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Price</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatPrice(product.price)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">In stock</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {product.quantity}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last verified</dt>
              <dd
                className="text-lg font-semibold"
                title={new Date(product.last_verified_at).toLocaleString()}
              >
                {timeAgo(product.last_verified_at)}
              </dd>
            </div>
            {category && (
              <div className="sm:col-span-3">
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium">{category}</dd>
              </div>
            )}
          </dl>

          <div>
            <h3 className="text-sm font-medium text-slate-500">Description</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
              {product.description?.trim() || "No description added."}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
