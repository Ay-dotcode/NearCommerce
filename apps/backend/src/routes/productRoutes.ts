import { verifyProductStock } from "@/controllers/productController";
import { Router } from "express";

const router = Router();

// Store owners must hit this to refresh the 30-day timer
router.patch("/:productId/verify", verifyProductStock);

export default router;
