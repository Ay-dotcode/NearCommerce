import {
  createReview,
  deleteReview,
  listOwnReviews,
  listReviews,
  updateReview,
} from "@/controllers/reviewController";
import { optionalAuth, requireAuth } from "@/middleware/auth.middleware";
import { Router } from "express";

const router = Router();

// Public list for a store or product; signed-in viewers also get is_mine.
router.get("/", optionalAuth, listReviews);

// Static paths go before /:reviewId.
router.get("/mine", requireAuth, listOwnReviews);

// Endpoint for submitting store/product ratings (1-5)
// Posting a review used to require a verified email (requireVerifiedEmail in
// middleware/trustGate.ts). Verification is switched off, so only a login is needed.
router.post("/", requireAuth, createReview);

// Shopper review management (edit/delete their own)
router.patch("/:reviewId", requireAuth, updateReview);
router.delete("/:reviewId", requireAuth, deleteReview);

export default router;
