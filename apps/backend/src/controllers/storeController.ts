import { db } from "@/config/database";
import {
  createStore,
  deleteStore,
  listStoresByOwner,
  toStoreDto,
  updateStore,
} from "@/services/store.service";
import { isProductStale } from "@/utils/freshness";
import { handleKnownError, isUuid, sendValidationError } from "@/utils/http";
import { storeRatingJoin, toRating } from "@/utils/ratings";
import { checkIfStoreIsOpen } from "@/utils/timezone";
import { CreateStoreSchema, UpdateStoreSchema } from "@nearcommerce/api";
import { Request, Response } from "express";

// A store page lists at most this many published products.
const STORE_DETAIL_PRODUCT_LIMIT = 200;

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function getStoreDetails(req: Request, res: Response) {
  const { storeId } = req.params;

  // Guards against Postgres "invalid input syntax for type uuid" (500) on paths like /stores/mine.
  if (!isUuid(storeId))
    return res.status(404).json({ error: "Store not found or suspended" });

  try {
    // Suspending an owner hides all of their stores (SRS 3.2.1).
    const result = await db.query(
      `SELECT s.id, s.name, s.description, s.address, s.timezone, s.opening_hours,
              s.latitude, s.longitude, rt.rating_avg, rt.review_count
         FROM stores s
         JOIN users u ON u.id = s.owner_id
         ${storeRatingJoin("s")}
        WHERE s.id = $1 AND s.is_suspended = false AND u.is_suspended = false`,
      [storeId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Store not found or suspended" });
    const { rating_avg, review_count, ...store } = result.rows[0];
    const isOpen = checkIfStoreIsOpen(store.opening_hours, store.timezone);

    // Shoppers see published listings only. Stock status is derived purely from quantity.
    const products = await db.query(
      `SELECT id, name, price, quantity, image_url, last_verified_at
         FROM products
        WHERE store_id = $1 AND is_published = true
        ORDER BY LOWER(name), id
        LIMIT $2`,
      [storeId, STORE_DETAIL_PRODUCT_LIMIT],
    );

    return res.status(200).json({
      data: {
        ...store,
        isOpen,
        is_open_now: isOpen,
        ...toRating({ rating_avg, review_count }),
        products: products.rows.map((p) => ({
          ...p,
          price: Number(p.price),
          in_stock: p.quantity > 0,
          isStale: isProductStale(p.last_verified_at),
        })),
      },
    });
  } catch (error) {
    console.error("Get store details error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// Store owner

export async function listMyStores(req: Request, res: Response) {
  if (req.user?.role !== "STORE_OWNER")
    return res.status(403).json({
      error:
        "This portal is for store owners. Shoppers can use the NearCommerce mobile app, or register a store owner account to sell here.",
      code: "OWNER_ROLE_REQUIRED",
    });

  try {
    return res.status(200).json({ data: await listStoresByOwner(req.user.id) });
  } catch (error) {
    console.error("listMyStores error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function createOwnerStore(req: Request, res: Response) {
  const parsed = CreateStoreSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  try {
    const store = await createStore(req.user!.id, parsed.data);
    return res.status(201).json({ data: store });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    console.error("createOwnerStore error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function getOwnerStore(req: Request, res: Response) {
  try {
    const { rows } = await db.query(`SELECT * FROM stores WHERE id = $1`, [
      req.store!.id,
    ]);
    return res.status(200).json({ data: toStoreDto(rows[0]) });
  } catch (error) {
    console.error("getOwnerStore error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function updateOwnerStore(req: Request, res: Response) {
  const parsed = UpdateStoreSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  try {
    const store = await updateStore(req.store!.id, parsed.data);
    return res.status(200).json({ data: store });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    console.error("updateOwnerStore error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function deleteOwnerStore(req: Request, res: Response) {
  try {
    const deleted = await deleteStore(req.store!.id);
    if (!deleted) return res.status(404).json({ error: "Store not found" });
    return res.status(204).send();
  } catch (error) {
    console.error("deleteOwnerStore error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
