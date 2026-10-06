import {
  deleteOwnReview,
  createReview as insertReview,
  isTargetVisible,
  listMyReviews,
  listTargetReviews,
  updateOwnReview,
} from "@/services/review.service";
import { isUuid, sendValidationError } from "@/utils/http";
import {
  CreateReviewSchema,
  MyReviewsQuerySchema,
  ReviewListQuerySchema,
  UpdateReviewSchema,
} from "@nearcommerce/api";
import { Request, Response } from "express";

const NOT_FOUND = { error: "Review not found." };

// Bad input becomes a 400 whose message names the problem.
function firstMessage(issues: { message: string }[]) {
  return issues[0]?.message ?? "Validation failed";
}

// POST /reviews
export async function createReview(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = CreateReviewSchema.safeParse(req.body);
  if (!parsed.success)
    return sendValidationError(
      res,
      parsed.error.issues,
      firstMessage(parsed.error.issues),
    );

  try {
    const target = parsed.data.storeId
      ? { storeId: parsed.data.storeId }
      : { productId: parsed.data.productId! };
    if (!(await isTargetVisible(target)))
      return res
        .status(404)
        .json({ error: "Target store or product does not exist." });

    const review = await insertReview(userId, parsed.data);
    return res
      .status(201)
      .json({ message: "Review submitted successfully", data: review });
  } catch (error: any) {
    // 23505 is the PostgreSQL error code for unique_violation
    if (error?.code === "23505")
      return res
        .status(409)
        .json({ error: "You have already reviewed this item." });
    console.error("[REVIEWS] createReview error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// GET /reviews?store_id=... or ?product_id=... (public)
export async function listReviews(req: Request, res: Response) {
  const parsed = ReviewListQuerySchema.safeParse(req.query);
  if (!parsed.success)
    return sendValidationError(res, parsed.error.issues, "Invalid query");

  try {
    const result = await listTargetReviews(parsed.data, req.user?.id);
    if (!result)
      return res
        .status(404)
        .json({ error: "Store or product not found or unavailable." });
    return res.json(result);
  } catch (error) {
    console.error("[REVIEWS] listReviews error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// GET /reviews/mine
export async function listOwnReviews(req: Request, res: Response) {
  const parsed = MyReviewsQuerySchema.safeParse(req.query);
  if (!parsed.success)
    return sendValidationError(res, parsed.error.issues, "Invalid query");

  try {
    return res.json(
      await listMyReviews(req.user!.id, parsed.data.page, parsed.data.limit),
    );
  } catch (error) {
    console.error("[REVIEWS] listOwnReviews error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// PATCH /reviews/:reviewId
export async function updateReview(req: Request, res: Response) {
  if (!isUuid(req.params.reviewId)) return res.status(404).json(NOT_FOUND);

  const parsed = UpdateReviewSchema.safeParse(req.body);
  if (!parsed.success)
    return sendValidationError(
      res,
      parsed.error.issues,
      firstMessage(parsed.error.issues),
    );

  try {
    const review = await updateOwnReview(
      req.user!.id,
      req.params.reviewId,
      parsed.data,
    );
    if (!review) return res.status(404).json(NOT_FOUND);
    return res.json({ message: "Review updated", data: review });
  } catch (error) {
    console.error("[REVIEWS] updateReview error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// DELETE /reviews/:reviewId
export async function deleteReview(req: Request, res: Response) {
  if (!isUuid(req.params.reviewId)) return res.status(404).json(NOT_FOUND);

  try {
    const removed = await deleteOwnReview(req.user!.id, req.params.reviewId);
    if (!removed) return res.status(404).json(NOT_FOUND);
    return res.status(204).send();
  } catch (error) {
    console.error("[REVIEWS] deleteReview error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
