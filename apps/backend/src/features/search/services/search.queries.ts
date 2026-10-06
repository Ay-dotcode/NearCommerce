import { escapeLike } from "@/utils/like";
import type { ProductSearchQueryInput } from "@nearcommerce/api";

// Positional-parameter builder, so optional filters never disturb $n numbering.
export class SqlParams {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

// WHERE clause shared by every product search path. A product is only ever shown when it is
// published, in stock, its store is active, its OWNER is active (SRS 3.2.1), and the store lies
// within the requested radius. Optional category filters are added on top.
//
// Expects the aliases p (products), s (stores) and u (users, the store owner).
export function productVisibilityWhere(
  params: SqlParams,
  query: Pick<
    ProductSearchQueryInput,
    "lat" | "lng" | "radius_meters" | "category_id" | "subcategory_id"
  >,
): string {
  const lat = params.add(query.lat);
  const lng = params.add(query.lng);
  const radius = params.add(query.radius_meters);

  const conditions = [
    "p.is_published = true",
    "p.quantity > 0",
    "s.is_suspended = false",
    "u.is_suspended = false",
    `earth_box(ll_to_earth(${lat}, ${lng}), ${radius}) @> ll_to_earth(s.latitude, s.longitude)`,
    `earth_distance(ll_to_earth(${lat}, ${lng}), ll_to_earth(s.latitude, s.longitude)) <= ${radius}`,
  ];

  // A subcategory is the narrower filter, so it wins when both are sent.
  if (query.subcategory_id) {
    conditions.push(`p.subcategory_id = ${params.add(query.subcategory_id)}`);
  } else if (query.category_id) {
    conditions.push(
      `p.subcategory_id IN (SELECT id FROM subcategories WHERE parent_category_id = ${params.add(query.category_id)})`,
    );
  }
  return conditions.join("\n  AND ");
}

export const distanceExpr = (latParam: string, lngParam: string) =>
  `earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(s.latitude, s.longitude))`;

// `ILIKE` pattern that treats the user's text literally ("50%" matches "50%", not "50anything").
export const containsPattern = (text: string) => `%${escapeLike(text)}%`;
