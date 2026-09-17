import { createReview } from "@/controllers/reviewController";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireVerifiedEmail } from "@/middleware/trustGate";
import { Router } from "express";

const router = Router();

// Endpoint for submitting store/product ratings (1-5)
router.post("/", requireAuth, requireVerifiedEmail, createReview);

export default router;
