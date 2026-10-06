import { db } from "@/config/database";
import { HttpError } from "@/utils/http";
import { storeRatingJoin, toRating } from "@/utils/ratings";
import { checkIfStoreIsOpen } from "@/utils/timezone";
import { FAVORITES_MAX, type AddFavoriteInput } from "@nearcommerce/api";

export interface FavoriteItem {
  id: string;
  type: "store" | "product";
  store_id: string | null;
  product_id: string | null;
  created_at: string;
  store?: {
    id: string;
    name: string;
    address: string;
    is_open: boolean;
    rating: number;
    review_count: number;
  };
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    in_stock: boolean;
    store_id: string;
    store_name: string;
  };
}

// A user's saved stores and products, newest first.
export async function listFavorites(
  userId: string,
  type?: "store" | "product",
): Promise<FavoriteItem[]> {
  const { rows } = await db.query(
    `SELECT f.id, f.created_at, f.store_id, f.product_id,
            s.name AS s_name, s.address AS s_address, s.timezone AS s_tz, s.opening_hours AS s_hours,
            rt.rating_avg, rt.review_count,
            p.name AS p_name, p.price AS p_price, p.image_url AS p_image, p.quantity AS p_qty,
            ps.id AS ps_id, ps.name AS ps_name
       FROM favorites f
       LEFT JOIN stores s ON s.id = f.store_id
       LEFT JOIN users su ON su.id = s.owner_id
       ${storeRatingJoin("s")}
       LEFT JOIN products p ON p.id = f.product_id
       LEFT JOIN stores ps ON ps.id = p.store_id
       LEFT JOIN users pu ON pu.id = ps.owner_id
      WHERE f.user_id = $1
        AND ($2::text IS NULL OR ($2 = 'store' AND f.store_id IS NOT NULL) OR ($2 = 'product' AND f.product_id IS NOT NULL))
        AND (
          (f.store_id IS NOT NULL AND s.is_suspended = false AND su.is_suspended = false)
          OR
          (f.product_id IS NOT NULL AND p.is_published = true
            AND ps.is_suspended = false AND pu.is_suspended = false)
        )
      ORDER BY f.created_at DESC, f.id`,
    [userId, type ?? null],
  );

  return rows.map((row): FavoriteItem => {
    const base = {
      id: row.id,
      store_id: row.store_id,
      product_id: row.product_id,
      created_at: row.created_at,
    };
    if (row.store_id)
      return {
        ...base,
        type: "store",
        store: {
          id: row.store_id,
          name: row.s_name,
          address: row.s_address,
          is_open: checkIfStoreIsOpen(row.s_hours, row.s_tz),
          ...toRating(row),
        },
      };
    return {
      ...base,
      type: "product",
      product: {
        id: row.product_id,
        name: row.p_name,
        price: Number(row.p_price),
        image_url: row.p_image,
        in_stock: row.p_qty > 0,
        store_id: row.ps_id,
        store_name: row.ps_name,
      },
    };
  });
}

async function assertTargetVisible(input: AddFavoriteInput) {
  if (input.store_id) {
    const { rowCount } = await db.query(
      `SELECT 1 FROM stores s JOIN users u ON u.id = s.owner_id
        WHERE s.id = $1 AND s.is_suspended = false AND u.is_suspended = false`,
      [input.store_id],
    );
    if (!rowCount) throw new HttpError(404, "Store not found or suspended");
    return;
  }
  const { rowCount } = await db.query(
    `SELECT 1 FROM products p
       JOIN stores s ON s.id = p.store_id
       JOIN users u ON u.id = s.owner_id
      WHERE p.id = $1 AND p.is_published = true
        AND s.is_suspended = false AND u.is_suspended = false`,
    [input.product_id],
  );
  if (!rowCount)
    throw new HttpError(
      404,
      "Product not found, unpublished, or store suspended",
    );
}

// Saves a store or product. Idempotent: saving something already saved returns the existing
// favorite with created=false, so a double tap or retry is harmless.
export async function addFavorite(
  userId: string,
  input: AddFavoriteInput,
): Promise<{ id: string; created: boolean }> {
  await assertTargetVisible(input);

  // The cap is checked inside the INSERT so concurrent requests can't slip past it.
  const inserted = await db.query(
    `INSERT INTO favorites (user_id, store_id, product_id)
     SELECT $1::uuid, $2::uuid, $3::uuid
      WHERE (SELECT COUNT(*) FROM favorites WHERE user_id = $1::uuid) < $4::int
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, input.store_id ?? null, input.product_id ?? null, FAVORITES_MAX],
  );
  if (inserted.rows.length > 0)
    return { id: inserted.rows[0].id, created: true };

  const existing = await db.query(
    `SELECT id FROM favorites
      WHERE user_id = $1 AND store_id IS NOT DISTINCT FROM $2 AND product_id IS NOT DISTINCT FROM $3`,
    [userId, input.store_id ?? null, input.product_id ?? null],
  );
  if (existing.rows.length > 0)
    return { id: existing.rows[0].id, created: false };

  throw new HttpError(
    409,
    `You can save up to ${FAVORITES_MAX} favorites. Remove some to add more.`,
  );
}

export async function removeFavorite(
  userId: string,
  favoriteId: string,
): Promise<void> {
  const { rowCount } = await db.query(
    "DELETE FROM favorites WHERE id = $1 AND user_id = $2",
    [favoriteId, userId],
  );
  // Someone else's favorite looks exactly like a missing one.
  if (!rowCount) throw new HttpError(404, "Favorite not found");
}
