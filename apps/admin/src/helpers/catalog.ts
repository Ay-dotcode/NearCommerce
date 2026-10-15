import type { AdminCategory, AdminSubcategory } from "@/types/admin";
import { pluralize } from "@nearcommerce/helpers";

// What an admin is about to delete from the catalog.
export type Deleting =
  | { kind: "category"; category: AdminCategory }
  | { kind: "sub"; category: AdminCategory; sub: AdminSubcategory };

// Plain-language warning shown before a category or subcategory is deleted.
export function deleteConsequences(d: Deleting): string {
  if (d.kind === "sub") {
    const n = d.sub.product_count;
    return n === 0
      ? `"${d.sub.name}" has no products. This can't be undone.`
      : `${pluralize(n, "product")} in "${d.sub.name}" will become uncategorised and stay on sale. This can't be undone.`;
  }
  const subs = d.category.subcategories.length;
  const n = d.category.product_count;
  const parts = [
    subs > 0 ? `its ${pluralize(subs, "subcategory", "subcategories")}` : null,
    n > 0 ? `${pluralize(n, "product")} will become uncategorised` : null,
  ].filter(Boolean);
  return parts.length === 0
    ? `"${d.category.name}" is empty. This can't be undone.`
    : `Deleting "${d.category.name}" also deletes ${parts.join("; ")}. This can't be undone.`;
}
