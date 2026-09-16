import { Request, Response } from "express";
import { SearchQuerySchema } from "@nearcommerce/api";
import { db } from "../../../config/database";
import { withCircuitBreaker, fetchGeminiEmbedding } from "../../../utils/circuitBreaker";

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, lat, lng, radius_meters } = SearchQuerySchema.parse(req.query);

    // Base filter mandatory rules: Published, In Stock, Store Active
    const baseConditions = `
      p.is_published = true
      AND p.quantity > 0
      AND s.is_suspended = false
      AND earth_box(ll_to_earth($1, $2), $3) @> ll_to_earth(s.latitude, s.longitude)
      AND earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude)) <= $3
    `;

    let products = [];
    let usedFallback = false;

    // If there is no search text, just return nearby products
    if (!q) {
      const result = await db.query(
        `
        SELECT p.id, p.name, p.price, p.image_url, s.id as store_id, s.name as store_name,
        earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude)) as distance_meters
        FROM products p
        JOIN stores s ON p.store_id = s.id
        WHERE ${baseConditions}
        ORDER BY distance_meters ASC
        LIMIT 50;
        `,
        [lat, lng, radius_meters],
      );

      return res.status(200).json({ data: result.rows, used_fallback: false });
    }

    // Attempt AI Vector Search with 2000ms circuit breaker
    try {
      const embedding = await withCircuitBreaker(fetchGeminiEmbedding(q), 2000);
      const vectorString = `[${embedding.join(",")}]`;

      const aiResult = await db.query(
        `
        SELECT p.id, p.name, p.price, p.image_url, s.id as store_id, s.name as store_name,
        earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude)) as distance_meters
        FROM products p
        JOIN stores s ON p.store_id = s.id
        WHERE ${baseConditions}
        ORDER BY p.embedding <-> $4::vector ASC, distance_meters ASC
        LIMIT 50;
        `,
        [lat, lng, radius_meters, vectorString],
      );

      products = aiResult.rows;
    } catch (aiError) {
      // AI Failed or Timed out. Trigger pg_trgm and tsvector fallback pipeline.
      console.warn(`[SEARCH FALLBACK] AI search failed for query "${q}":`, aiError);
      usedFallback = true;

      const fallbackResult = await db.query(
        `
        SELECT p.id, p.name, p.price, p.image_url, s.id as store_id, s.name as store_name,
        earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude)) as distance_meters
        FROM products p
        JOIN stores s ON p.store_id = s.id
        WHERE ${baseConditions}
        AND (
          p.name ILIKE $4 OR
          to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', $5) OR
          p.name % $5
        )
        ORDER BY distance_meters ASC
        LIMIT 50;
        `,
        [lat, lng, radius_meters, `%${q}%`, q],
      );

      products = fallbackResult.rows;
    }

    return res.status(200).json({
      data: products,
      used_fallback: usedFallback,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid search parameters", details: JSON.parse(error.message) });
    }
    console.error("Search API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
