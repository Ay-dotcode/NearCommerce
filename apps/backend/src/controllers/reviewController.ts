import { db } from "@/config/database";
import { MAX_RATING, MIN_RATING } from "@/constants";
import { Request, Response } from "express";

export async function createReview(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { storeId, productId, rating, comment } = req.body;

  // Enforce mutual exclusivity and existence of targets
  if (!storeId && !productId)
    return res
      .status(400)
      .json({ error: "Must provide either storeId or productId." });
  if (storeId && productId)
    return res.status(400).json({
      error: "Cannot review both a store and a product in the same request.",
    });
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < MIN_RATING ||
    rating > MAX_RATING
  )
    return res.status(400).json({
      error: `Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}.`,
    });
  try {
    const result = await db.query(
      `INSERT INTO reviews (user_id, store_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, store_id, product_id, rating, comment, created_at`,
      [userId, storeId || null, productId || null, rating, comment || null],
    );
    return res.status(201).json({
      message: "Review submitted successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    // 23505 is the PostgreSQL error code for unique_violation
    if (error?.code === "23505")
      return res
        .status(409)
        .json({ error: "You have already reviewed this item." });
    // 23503 is the PostgreSQL error code for foreign_key_violation
    if (error?.code === "23503")
      return res
        .status(404)
        .json({ error: "Target store or product does not exist." });
    console.error("[REVIEWS] createReview error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
