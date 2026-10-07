import { db } from "@/config/database";
import type { ReviewTarget } from "@/types/review";
import type {
  CreateReviewInput,
  ReviewListQuery,
  UpdateReviewInput,
} from "@nearcommerce/api";

// "Jane Doe" -> "Jane D." so public lists don't expose full names.
export function displayName(fullName: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Shopper";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// Stores and products are reviewable only while shoppers can see them.
export async function isTargetVisible(target: ReviewTarget) {
  const { rows } =
    "storeId" in target
      ? await db.query(
          `SELECT 1 FROM stores s JOIN users u ON u.id = s.owner_id
            WHERE s.id = $1 AND s.is_suspended = false AND u.is_suspended = false`,
          [target.storeId],
        )
      : await db.query(
          `SELECT 1 FROM products p
             JOIN stores s ON s.id = p.store_id
             JOIN users u ON u.id = s.owner_id
            WHERE p.id = $1 AND p.is_published = true
              AND s.is_suspended = false AND u.is_suspended = false`,
          [target.productId],
        );
  return rows.length > 0;
}

export async function isOwnTarget(userId: string, target: ReviewTarget) {
  const { rows } =
    "storeId" in target
      ? await db.query(`SELECT 1 FROM stores WHERE id = $1 AND owner_id = $2`, [
          target.storeId,
          userId,
        ])
      : await db.query(
          `SELECT 1 FROM products p JOIN stores s ON s.id = p.store_id
            WHERE p.id = $1 AND s.owner_id = $2`,
          [target.productId, userId],
        );
  return rows.length > 0;
}

const REVIEW_COLUMNS = `id, store_id, product_id, rating, comment, created_at, updated_at`;

export async function createReview(userId: string, input: CreateReviewInput) {
  const { rows } = await db.query(
    `INSERT INTO reviews (user_id, store_id, product_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${REVIEW_COLUMNS}`,
    [
      userId,
      input.storeId ?? null,
      input.productId ?? null,
      input.rating,
      input.comment || null,
    ],
  );
  return rows[0];
}

// One page of reviews for a store or product, plus the rating summary.
// Returns null when the target is hidden or doesn't exist.
export async function listTargetReviews(
  query: ReviewListQuery,
  viewerId?: string,
) {
  const target: ReviewTarget = query.store_id
    ? { storeId: query.store_id }
    : { productId: query.product_id! };
  if (!(await isTargetVisible(target))) return null;

  const column = "storeId" in target ? "store_id" : "product_id";
  const targetId = "storeId" in target ? target.storeId : target.productId;
  const offset = (query.page - 1) * query.limit;

  const [page, summary] = await Promise.all([
    db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
              u.full_name, (r.user_id = $4::uuid) AS is_mine
         FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.${column} = $1
        ORDER BY r.created_at DESC, r.id
        LIMIT $2 OFFSET $3`,
      [targetId, query.limit, offset, viewerId ?? null],
    ),
    db.query(
      `SELECT rating, COUNT(*)::int AS count FROM reviews
        WHERE ${column} = $1 GROUP BY rating`,
      [targetId],
    ),
  ]);

  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  let total = 0;
  let points = 0;
  for (const row of summary.rows) {
    distribution[String(row.rating)] = row.count;
    total += row.count;
    points += row.rating * row.count;
  }

  return {
    data: page.rows.map(({ full_name, is_mine, ...review }) => ({
      ...review,
      reviewer_name: displayName(full_name),
      is_mine: Boolean(is_mine),
    })),
    summary: {
      rating: total ? Math.round((points / total) * 10) / 10 : 0,
      review_count: total,
      distribution,
    },
    pagination: { page: query.page, limit: query.limit, total },
  };
}

export async function listMyReviews(
  userId: string,
  page: number,
  limit: number,
) {
  const offset = (page - 1) * limit;
  const [rows, count] = await Promise.all([
    db.query(
      `SELECT r.id, r.store_id, r.product_id, r.rating, r.comment,
              r.created_at, r.updated_at,
              CASE WHEN r.store_id IS NOT NULL THEN 'STORE' ELSE 'PRODUCT' END
                AS target_type,
              COALESCE(s.name, p.name) AS target_name,
              p.store_id AS product_store_id
         FROM reviews r
         LEFT JOIN stores s ON s.id = r.store_id
         LEFT JOIN products p ON p.id = r.product_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC, r.id
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    db.query(`SELECT COUNT(*)::int AS count FROM reviews WHERE user_id = $1`, [
      userId,
    ]),
  ]);
  return {
    data: rows.rows,
    pagination: { page, limit, total: count.rows[0].count },
  };
}

// Only the author can edit; anyone else gets null (reported as 404).
export async function updateOwnReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewInput,
) {
  const sets: string[] = [];
  const values: unknown[] = [reviewId, userId];
  if (input.rating !== undefined) {
    values.push(input.rating);
    sets.push(`rating = $${values.length}`);
  }
  if (input.comment !== undefined) {
    values.push(input.comment || null);
    sets.push(`comment = $${values.length}`);
  }

  const { rows } = await db.query(
    `UPDATE reviews SET ${sets.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING ${REVIEW_COLUMNS}`,
    values,
  );
  return rows[0] ?? null;
}

export async function deleteOwnReview(userId: string, reviewId: string) {
  const { rowCount } = await db.query(
    `DELETE FROM reviews WHERE id = $1 AND user_id = $2`,
    [reviewId, userId],
  );
  return (rowCount ?? 0) > 0;
}
