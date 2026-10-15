import type { Category } from "@/types/categories";
import type { StoreProduct } from "@/types/products";
import { hasAtMostTwoDecimals } from "@nearcommerce/helpers";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// "Dairy › Milk" for a product, or null when it has no subcategory.
export function categoryLabel(product: StoreProduct, categories: Category[] = []) {
  if (!product.subcategory_id) return null;
  for (const category of categories) {
    const sub = category.subcategories.find(
      (s) => s.id === product.subcategory_id,
    );
    if (sub) return `${category.name} › ${sub.name}`;
  }
  return null;
}

// True when a product has not been confirmed in stock for over 30 days.
export const isStale = (p: StoreProduct) =>
  p.isStale ??
  Date.now() - new Date(p.last_verified_at).getTime() > THIRTY_DAYS_MS;

// Yup test: a price may have at most 2 decimal places (non-numbers are left to other rules).
export const hasValidPriceDecimals = (v: unknown) =>
  typeof v !== "number" || hasAtMostTwoDecimals(v);
