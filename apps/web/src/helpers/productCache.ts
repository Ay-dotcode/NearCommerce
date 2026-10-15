import type { ProductListResponse } from "@/types/products";

// After the owner confirms a product is still in stock, update every cached inventory list in
// place: the product's own row, and the store-wide "needs verification" count in each cached
// summary. Without this the cached lists for other filters keep showing the old count (and the
// "haven't been verified recently" banner) until they refetch.
export function applyVerified(
  old: ProductListResponse | undefined,
  productId: string,
  wasStale: boolean,
  verifiedAt: string,
): ProductListResponse | undefined {
  if (!old) return old;
  const meta = old.meta && {
    ...old.meta,
    summary: {
      ...old.meta.summary,
      stale: Math.max(0, old.meta.summary.stale - (wasStale ? 1 : 0)),
    },
  };
  return {
    ...old,
    data: old.data.map((p) =>
      p.id === productId
        ? { ...p, last_verified_at: verifiedAt, isStale: false }
        : p,
    ),
    meta,
  };
}
