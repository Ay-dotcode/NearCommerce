import { db } from "@/config/database";
import { STORE_KEY } from "@/constants";
import { scheduleProductEmbeddings } from "@/services/embedding.service";
import {
  createProduct,
  deleteProduct,
  importProducts,
  listStoreProducts,
  PRODUCT_COLUMNS,
  serializeProduct,
  updateProduct,
} from "@/services/product.service";
import { isProductStale } from "@/utils/freshness";
import {
  handleKnownError,
  isUuid,
  sendValidationError,
  ValidationDetail,
} from "@/utils/http";
import {
  CreateProductSchema,
  ImportProductRowSchema,
  ImportProductsBodySchema,
  ProductListQuerySchema,
  UpdateProductSchema,
  type ImportProductRow,
} from "@nearcommerce/api";
import { Request, Response } from "express";

const MAX_REPORTED_ROW_ERRORS = 50;

export async function verifyProductStock(req: Request, res: Response) {
  const { productId } = req.params;
  const storeId = req.headers[STORE_KEY];

  if (!storeId || Array.isArray(storeId))
    return res.status(400).json({ error: "Missing X-Store-ID header" });

  try {
    const result = await db.query(
      `UPDATE products 
       SET last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND store_id = $2
         AND EXISTS (
           SELECT 1
           FROM stores
           WHERE stores.id = products.store_id
             AND (stores.owner_id = $3 OR $4 = 'SYSTEM_ADMIN')
         )
       RETURNING ${PRODUCT_COLUMNS}`,
      [productId, storeId, req.user?.id, req.user?.role],
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Product not found or does not belong to this store" });

    return res.status(200).json({
      message: "Product stock verified successfully",
      data: serializeProduct(result.rows[0]),
    });
  } catch (error) {
    console.error("verifyProductStock error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function getProductById(req: Request, res: Response) {
  const { productId } = req.params;

  if (!isUuid(productId))
    return res.status(404).json({
      error: "Product not found, unpublished, or store suspended",
    });

  try {
    // Hidden when the product is unpublished, the store is suspended, or the owner is suspended.
    const result = await db.query(
      `SELECT ${PRODUCT_COLUMNS.split(",")
        .map((c) => `p.${c.trim()}`)
        .join(", ")},
              s.name AS store_name, pr.rating_avg, pr.review_count
       FROM products p
       JOIN stores s ON p.store_id = s.id
       JOIN users u ON s.owner_id = u.id
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(r.rating)::numeric, 1)::float AS rating_avg, COUNT(*)::int AS review_count
           FROM reviews r WHERE r.product_id = p.id
       ) pr ON true
       WHERE p.id = $1 AND p.is_published = true
         AND s.is_suspended = false AND u.is_suspended = false`,
      [productId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({
        error: "Product not found, unpublished, or store suspended",
      });

    const { store_name, rating_avg, review_count, ...product } = result.rows[0];
    return res.status(200).json({
      ...product,
      store: { id: product.store_id, name: store_name },
      rating: rating_avg ?? 0,
      review_count: review_count ?? 0,
      price: Number(product.price),
      isStale: isProductStale(product.last_verified_at),
    });
  } catch (error) {
    console.error("getProductById error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// Store owner (all handlers run after requireAuth + requireStoreAccess)

export async function getStoreProducts(req: Request, res: Response) {
  const parsed = ProductListQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  try {
    return res
      .status(200)
      .json(await listStoreProducts(req.store!.id, parsed.data));
  } catch (error) {
    console.error("getStoreProducts error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function createOwnerProduct(req: Request, res: Response) {
  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  try {
    const product = await createProduct(req.store!.id, parsed.data);
    scheduleProductEmbeddings([product.id]);
    return res.status(201).json({ data: product });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    console.error("createOwnerProduct error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function updateOwnerProduct(req: Request, res: Response) {
  const { productId } = req.params;
  if (!isUuid(productId))
    return res.status(404).json({ error: "Product not found" });

  const parsed = UpdateProductSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  try {
    const result = await updateProduct(req.store!.id, productId, parsed.data);
    if (!result)
      return res.status(404).json({ error: "Product not found in this store" });
    if (result.needsEmbedding) scheduleProductEmbeddings([productId]);
    return res.status(200).json({ data: result.product });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    console.error("updateOwnerProduct error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function deleteOwnerProduct(req: Request, res: Response) {
  const { productId } = req.params;
  if (!isUuid(productId))
    return res.status(404).json({ error: "Product not found" });

  try {
    const deleted = await deleteProduct(req.store!.id, productId);
    if (!deleted)
      return res.status(404).json({ error: "Product not found in this store" });
    return res.status(204).send();
  } catch (error) {
    console.error("deleteOwnerProduct error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function importOwnerProducts(req: Request, res: Response) {
  const body = ImportProductsBodySchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error.issues);

  // Validate every row first so the owner gets one complete list of problems and nothing is half-imported.
  const rows: ImportProductRow[] = [];
  const problems: ValidationDetail[] = [];
  body.data.products.forEach((raw, index) => {
    const parsed = ImportProductRowSchema.safeParse(raw);
    if (parsed.success) return rows.push(parsed.data);
    for (const issue of parsed.error.issues)
      problems.push({
        path: `row ${index + 1}: ${issue.path.join(".") || "row"}`,
        message: issue.message,
      });
  });

  if (problems.length > 0)
    return res.status(422).json({
      error: "Some rows are invalid. Fix them and upload the file again.",
      details: problems.slice(0, MAX_REPORTED_ROW_ERRORS),
      totalProblems: problems.length,
    });

  try {
    const { embeddingIds, ...summary } = await importProducts(
      req.store!.id,
      rows,
    );
    scheduleProductEmbeddings(embeddingIds);
    return res.status(200).json({ data: summary });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    console.error("importOwnerProducts error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
