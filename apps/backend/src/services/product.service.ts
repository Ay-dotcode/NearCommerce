import { db } from "@/config/database";
import { PRODUCT_FRESHNESS_THRESHOLD_DAYS } from "@/constants";
import { isProductStale } from "@/utils/freshness";
import { HttpError } from "@/utils/http";
import type {
  CreateProductInput,
  ImportProductRow,
  ProductListQuery,
  UpdateProductInput,
} from "@nearcommerce/api";

// Never select `embedding` (768 floats) or `search_tsv`; they are internal.
export const PRODUCT_COLUMNS = `id, store_id, subcategory_id, name, description, price, quantity,
  image_url, is_published, last_verified_at, created_at, updated_at`;

export interface ProductDto {
  id: string;
  store_id: string;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  image_url: string | null;
  is_published: boolean;
  last_verified_at: string;
  created_at: string;
  updated_at: string;
  isStale: boolean;
}

export function serializeProduct(row: Record<string, any>): ProductDto {
  return {
    ...(row as Omit<ProductDto, "price" | "isStale">),
    price: Number(row.price),
    isStale: isProductStale(row.last_verified_at),
  };
}

// Price or quantity edits re-verify the listing (SRS 3.2.4); other edits do not.
export function shouldRefreshFreshness(
  current: { price: number | string; quantity: number },
  patch: { price?: number; quantity?: number },
): boolean {
  const priceChanged =
    patch.price !== undefined && Number(current.price) !== patch.price;
  const quantityChanged =
    patch.quantity !== undefined && current.quantity !== patch.quantity;
  return priceChanged || quantityChanged;
}

const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

const STATUS_CLAUSES: Record<string, string> = {
  all: "TRUE",
  published: "is_published = true",
  draft: "is_published = false",
  out_of_stock: "quantity = 0",
  stale: `last_verified_at < NOW() - INTERVAL '${PRODUCT_FRESHNESS_THRESHOLD_DAYS} days'`,
};

export async function listStoreProducts(
  storeId: string,
  query: ProductListQuery,
) {
  const params: unknown[] = [storeId];
  let where = `store_id = $1 AND ${STATUS_CLAUSES[query.status]}`;
  if (query.q) {
    params.push(`%${escapeLike(query.q)}%`);
    where += ` AND name ILIKE $${params.length}`;
  }

  const [count, page, summary] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS total FROM products WHERE ${where}`,
      params,
    ),
    db.query(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE ${where}
        ORDER BY created_at DESC, id
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    ),
    db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_published)::int AS published,
              COUNT(*) FILTER (WHERE NOT is_published)::int AS drafts,
              COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock,
              COUNT(*) FILTER (WHERE ${STATUS_CLAUSES.stale})::int AS stale
         FROM products WHERE store_id = $1`,
      [storeId],
    ),
  ]);

  const total: number = count.rows[0].total;
  return {
    data: page.rows.map(serializeProduct),
    meta: {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      summary: {
        total: summary.rows[0].total,
        published: summary.rows[0].published,
        drafts: summary.rows[0].drafts,
        outOfStock: summary.rows[0].out_of_stock,
        stale: summary.rows[0].stale,
      },
    },
  };
}

export async function createProduct(
  storeId: string,
  input: CreateProductInput,
) {
  const { rows } = await db.query(
    `INSERT INTO products
       (store_id, subcategory_id, name, description, price, quantity, image_url, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PRODUCT_COLUMNS}`,
    [
      storeId,
      input.subcategoryId ?? null,
      input.name,
      input.description ?? null,
      input.price,
      input.quantity,
      input.imageUrl ?? null,
      input.isPublished,
    ],
  );
  return serializeProduct(rows[0]);
}

export interface UpdateProductResult {
  product: ProductDto;
  /** True when name/description changed, so the embedding must be regenerated. */
  needsEmbedding: boolean;
}

export async function updateProduct(
  storeId: string,
  productId: string,
  patch: UpdateProductInput,
): Promise<UpdateProductResult | null> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT ${PRODUCT_COLUMNS}, (embedding IS NULL) AS missing_embedding
         FROM products WHERE id = $1 AND store_id = $2 FOR UPDATE`,
      [productId, storeId],
    );
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const row = current.rows[0];

    const finalImage =
      patch.imageUrl !== undefined ? patch.imageUrl : row.image_url;
    const finalPublished =
      patch.isPublished !== undefined ? patch.isPublished : row.is_published;
    if (finalPublished && !finalImage)
      throw new HttpError(422, "Product cannot be published without an image", [
        {
          path: patch.imageUrl === null ? "imageUrl" : "isPublished",
          message: "Add an image or keep the product as a draft",
        },
      ]);

    const sets: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (patch.name !== undefined) add("name", patch.name);
    if (patch.description !== undefined) add("description", patch.description);
    if (patch.price !== undefined) add("price", patch.price);
    if (patch.quantity !== undefined) add("quantity", patch.quantity);
    if (patch.subcategoryId !== undefined)
      add("subcategory_id", patch.subcategoryId);
    if (patch.imageUrl !== undefined) add("image_url", patch.imageUrl);
    if (patch.isPublished !== undefined) add("is_published", patch.isPublished);
    if (shouldRefreshFreshness(row, patch))
      sets.push("last_verified_at = CURRENT_TIMESTAMP");

    values.push(productId, storeId);
    const updated = await client.query(
      `UPDATE products SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length - 1} AND store_id = $${values.length}
        RETURNING ${PRODUCT_COLUMNS}`,
      values,
    );
    await client.query("COMMIT");

    const textChanged =
      (patch.name !== undefined && patch.name !== row.name) ||
      (patch.description !== undefined &&
        (patch.description ?? null) !== (row.description ?? null));

    return {
      product: serializeProduct(updated.rows[0]),
      needsEmbedding: textChanged || row.missing_embedding,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProduct(
  storeId: string,
  productId: string,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM products WHERE id = $1 AND store_id = $2`,
    [productId, storeId],
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// CSV import (dual-mode: creates new products, updates existing ones by name)
// ---------------------------------------------------------------------------

export interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  /** Rows dropped because a later row in the same file had the same name. */
  duplicatesMerged: number;
  embeddingIds: string[];
}

export const importKey = (name: string) => name.trim().toLowerCase();

/** Last row wins when a file lists the same product name more than once. */
export function dedupeImportRows(rows: ImportProductRow[]) {
  const byKey = new Map<string, ImportProductRow>();
  for (const row of rows) byKey.set(importKey(row.name), row);
  return { rows: [...byKey.values()], merged: rows.length - byKey.size };
}

/**
 * New product: published only when it has an image (and the row doesn't say otherwise).
 * Existing product: a row without an image never unpublishes or wipes the current image,
 * so a price/quantity-only CSV is safe to re-upload.
 */
export function resolveImportVisibility(
  row: ImportProductRow,
  existing?: { image_url: string | null; is_published: boolean },
): { imageUrl: string | null; isPublished: boolean } {
  if (row.image_url)
    return { imageUrl: row.image_url, isPublished: row.is_published ?? true };
  if (existing)
    return { imageUrl: existing.image_url, isPublished: existing.is_published };
  return { imageUrl: null, isPublished: false };
}

export async function importProducts(
  storeId: string,
  incoming: ImportProductRow[],
): Promise<ImportSummary> {
  const { rows, merged } = dedupeImportRows(incoming);
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query(
      `SELECT id, lower(btrim(name)) AS key, description, price, quantity, image_url,
              is_published, (embedding IS NULL) AS missing_embedding
         FROM products
        WHERE store_id = $1 AND lower(btrim(name)) = ANY($2::text[])
        ORDER BY created_at ASC`,
      [storeId, rows.map((r) => importKey(r.name))],
    );
    const existing = new Map<string, Record<string, any>>();
    for (const e of existingRes.rows)
      if (!existing.has(e.key)) existing.set(e.key, e);

    const toCreate: ImportProductRow[] = [];
    const toUpdate: {
      id: string;
      row: ImportProductRow;
      existing: Record<string, any>;
    }[] = [];
    const embeddingIds: string[] = [];

    for (const row of rows) {
      const match = existing.get(importKey(row.name));
      if (match) {
        toUpdate.push({ id: match.id, row, existing: match });
        const descriptionChanged =
          row.description != null &&
          row.description !== (match.description ?? null);
        if (descriptionChanged || match.missing_embedding)
          embeddingIds.push(match.id);
      } else toCreate.push(row);
    }

    if (toCreate.length > 0) {
      const visibility = toCreate.map((r) => resolveImportVisibility(r));
      const created = await client.query(
        `INSERT INTO products
           (store_id, name, description, price, quantity, image_url, is_published)
         SELECT $1::uuid, v.name, v.description, v.price, v.quantity, v.image_url, v.is_published
           FROM unnest($2::text[], $3::text[], $4::numeric[], $5::int[], $6::text[], $7::bool[])
             AS v(name, description, price, quantity, image_url, is_published)
         RETURNING id`,
        [
          storeId,
          toCreate.map((r) => r.name),
          toCreate.map((r) => r.description ?? null),
          toCreate.map((r) => r.price),
          toCreate.map((r) => r.quantity),
          visibility.map((v) => v.imageUrl),
          visibility.map((v) => v.isPublished),
        ],
      );
      embeddingIds.push(...created.rows.map((r) => r.id));
    }

    if (toUpdate.length > 0) {
      const visibility = toUpdate.map((u) =>
        resolveImportVisibility(u.row, u.existing as any),
      );
      await client.query(
        `UPDATE products p
            SET description = COALESCE(v.description, p.description),
                price = v.price,
                quantity = v.quantity,
                image_url = v.image_url,
                is_published = v.is_published,
                last_verified_at = CASE
                  WHEN p.price IS DISTINCT FROM v.price OR p.quantity IS DISTINCT FROM v.quantity
                  THEN CURRENT_TIMESTAMP ELSE p.last_verified_at END,
                updated_at = CURRENT_TIMESTAMP
           FROM unnest($1::uuid[], $2::text[], $3::numeric[], $4::int[], $5::text[], $6::bool[])
             AS v(id, description, price, quantity, image_url, is_published)
          WHERE p.id = v.id AND p.store_id = $7`,
        [
          toUpdate.map((u) => u.id),
          toUpdate.map((u) => u.row.description ?? null),
          toUpdate.map((u) => u.row.price),
          toUpdate.map((u) => u.row.quantity),
          visibility.map((v) => v.imageUrl),
          visibility.map((v) => v.isPublished),
          storeId,
        ],
      );
    }

    await client.query("COMMIT");
    return {
      total: incoming.length,
      created: toCreate.length,
      updated: toUpdate.length,
      duplicatesMerged: merged,
      embeddingIds,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
