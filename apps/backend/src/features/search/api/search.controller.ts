import { db } from "@/config/database";
import {
  GEMINI_CIRCUIT_BREAKER_TIMEOUT_MS,
  SEARCH_RESULTS_LIMIT,
} from "@/constants";
import {
  containsPattern,
  productVisibilityWhere,
} from "@/features/search/services/search.queries";
import { SqlParams } from "@/types/sql";
import {
  fetchGeminiEmbedding,
  withCircuitBreaker,
} from "@/utils/circuitBreaker";
import { isProductStale } from "@/utils/freshness";
import { sendValidationError } from "@/utils/http";
import { storeRatingJoin, toRating } from "@/utils/ratings";
import { checkIfStoreIsOpen } from "@/utils/timezone";
import {
  ProductSearchQuerySchema,
  StoreSearchQuerySchema,
} from "@nearcommerce/api";
import { Request, Response } from "express";

const SELECT_PRODUCT = (distance: string) => `
  SELECT p.id, p.name, p.price, p.quantity, p.image_url, p.subcategory_id,
         p.last_verified_at,
         s.id AS store_id, s.name AS store_name,
         s.latitude AS store_latitude, s.longitude AS store_longitude,
         ${distance} AS distance_meters
    FROM products p
    JOIN stores s ON p.store_id = s.id
    JOIN users u ON s.owner_id = u.id`;

// Shoppers see stock and freshness on every result card (SRS 5.2.2). Stock is derived
// purely from quantity, and the raw timestamp stays server-side.
const toProductResult = (row: any) => {
  const { last_verified_at, ...rest } = row;
  return {
    ...rest,
    price: Number(rest.price),
    in_stock: rest.quantity > 0,
    isStale: isProductStale(last_verified_at),
  };
};

export const searchProducts = async (req: Request, res: Response) => {
  const parsed = ProductSearchQuerySchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({
      error: "Invalid search parameters",
      details: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  const query = parsed.data;
  const q = query.q?.trim();

  try {
    // Nearby, visible products with no text: nearest first.
    if (!q) {
      const params = new SqlParams();
      const where = productVisibilityWhere(params, query);
      const distance = `earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude))`;
      const limit = params.add(SEARCH_RESULTS_LIMIT);
      const result = await db.query(
        `${SELECT_PRODUCT(distance)}
         WHERE ${where}
         ORDER BY distance_meters ASC
         LIMIT ${limit}`,
        params.values,
      );
      return res.status(200).json({
        data: result.rows.map(toProductResult),
        used_fallback: false,
      });
    }

    let rows: unknown[] = [];
    let usedFallback = false;

    // Attempt AI vector search within the circuit breaker's time budget.
    try {
      const embedding = await withCircuitBreaker(
        fetchGeminiEmbedding(q),
        GEMINI_CIRCUIT_BREAKER_TIMEOUT_MS,
      );
      const params = new SqlParams();
      const where = productVisibilityWhere(params, query);
      const vector = params.add(`[${embedding.join(",")}]`);
      const limit = params.add(SEARCH_RESULTS_LIMIT);
      const distance = `earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude))`;
      rows = (
        await db.query(
          `${SELECT_PRODUCT(distance)}
           WHERE ${where}
           ORDER BY p.embedding <-> ${vector}::vector ASC, distance_meters ASC
           LIMIT ${limit}`,
          params.values,
        )
      ).rows;
    } catch (aiError) {
      // AI failed or timed out: fall back to trigram + full-text matching.
      console.warn(
        `[SEARCH FALLBACK] AI search failed for query "${q}":`,
        aiError,
      );
      usedFallback = true;

      const params = new SqlParams();
      const where = productVisibilityWhere(params, query);
      const like = params.add(containsPattern(q));
      const text = params.add(q);
      const limit = params.add(SEARCH_RESULTS_LIMIT);
      const distance = `earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude))`;
      rows = (
        await db.query(
          `${SELECT_PRODUCT(distance)}
           WHERE ${where}
             AND (
               p.name ILIKE ${like} OR
               to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', ${text}) OR
               p.name % ${text}
             )
           ORDER BY distance_meters ASC
           LIMIT ${limit}`,
          params.values,
        )
      ).rows;
    }

    return res.status(200).json({
      data: (rows as any[]).map(toProductResult),
      used_fallback: usedFallback,
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /search/stores: stores near the shopper, nearest first, with an Open/Closed flag evaluated
// in each store's own timezone and the average community rating (SRS 5.1.2).
export const searchStores = async (req: Request, res: Response) => {
  const parsed = StoreSearchQuerySchema.safeParse(req.query);
  if (!parsed.success)
    return sendValidationError(
      res,
      parsed.error.issues,
      "Invalid search parameters",
    );
  const { lat, lng, radius_meters, q } = parsed.data;

  try {
    const params = new SqlParams();
    const pLat = params.add(lat);
    const pLng = params.add(lng);
    const pRadius = params.add(radius_meters);
    const nameFilter = q
      ? `AND (s.name ILIKE ${params.add(containsPattern(q))} OR s.name % ${params.add(q)})`
      : "";
    const limit = params.add(SEARCH_RESULTS_LIMIT);

    const result = await db.query(
      `SELECT s.id, s.name, s.address, s.latitude, s.longitude, s.timezone, s.opening_hours,
              earth_distance(ll_to_earth(${pLat}, ${pLng}), ll_to_earth(s.latitude, s.longitude)) AS distance_meters,
              rt.rating_avg, rt.review_count
         FROM stores s
         JOIN users u ON u.id = s.owner_id
         ${storeRatingJoin("s")}
        WHERE s.is_suspended = false
          AND u.is_suspended = false
          AND earth_box(ll_to_earth(${pLat}, ${pLng}), ${pRadius}) @> ll_to_earth(s.latitude, s.longitude)
          AND earth_distance(ll_to_earth(${pLat}, ${pLng}), ll_to_earth(s.latitude, s.longitude)) <= ${pRadius}
          ${nameFilter}
        ORDER BY distance_meters ASC
        LIMIT ${limit}`,
      params.values,
    );

    return res.status(200).json({
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        distance_meters: row.distance_meters,
        is_open: checkIfStoreIsOpen(row.opening_hours, row.timezone),
        ...toRating(row),
      })),
    });
  } catch (error) {
    console.error("Store search error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
