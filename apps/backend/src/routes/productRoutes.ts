import {
  getProductById,
  getStoreProducts,
  verifyProductStock,
} from "@/controllers/productController";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/rbac";
import { Router } from "express";

const router = Router();

router.get("/", getStoreProducts);
router.get("/:productId", getProductById);
router.patch(
  "/:productId/confirm-stock",
  requireAuth,
  requireRole(["STORE_OWNER", "SYSTEM_ADMIN"]),
  verifyProductStock,
);
router.patch(
  "/:productId/verify",
  requireAuth,
  requireRole(["STORE_OWNER", "SYSTEM_ADMIN"]),
  verifyProductStock,
);

export default router;
