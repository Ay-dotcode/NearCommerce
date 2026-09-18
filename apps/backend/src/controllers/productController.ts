import { db } from "@/config/database";
import { Request, Response } from "express";

export async function verifyProductStock(req: Request, res: Response) {
  const { productId } = req.params;
  const storeId = req.headers["x-store-id"];

  if (!storeId)
    return res.status(400).json({ error: "Missing X-Store-ID header" });

  try {
    const result = await db.query(
      `UPDATE products 
       SET last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND store_id = $2
       RETURNING id, last_verified_at`,
      [productId, storeId],
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Product not found or does not belong to this store" });

    return res.status(200).json({
      message: "Product stock verified successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("verifyProductStock error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function getStoreProducts(req: Request, res: Response) {
  const storeId = req.headers["x-store-id"];

  if (!storeId)
    return res.status(400).json({ error: "Missing X-Store-ID header" });

  try {
    const result = await db.query(
      `SELECT id, name, price, quantity, is_published, last_verified_at, created_at, updated_at
       FROM products
       WHERE store_id = $1
       ORDER BY created_at DESC`,
      [storeId],
    );

    return res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    console.error("getStoreProducts error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
