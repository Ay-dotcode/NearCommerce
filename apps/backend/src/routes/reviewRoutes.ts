import {
  createReview,
  deleteReview,
  listOwnReviews,
  listReviews,
  updateReview,
} from "@/controllers/reviewController";
import { optionalAuth, requireAuth } from "@/middleware/auth.middleware";
import { requireVerifiedEmail } from "@/middleware/trustGate";
import { Router } from "express";

const router = Router();

// Public list for a store or product; signed-in viewers also get is_mine.
router.get("/", optionalAuth, listReviews);

// Static paths go before /:reviewId.
router.get("/mine", requireAuth, listOwnReviews);

// Endpoint for submitting store/product ratings (1-5)
router.post("/", requireAuth, requireVerifiedEmail, createReview);

// Shopper review management (edit/delete their own)
router.patch("/:reviewId", requireAuth, updateReview);
router.delete("/:reviewId", requireAuth, deleteReview);

export default router;
