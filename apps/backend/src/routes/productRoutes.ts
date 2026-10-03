import {
  createOwnerProduct,
  deleteOwnerProduct,
  getProductById,
  getStoreProducts,
  importOwnerProducts,
  updateOwnerProduct,
  verifyProductStock,
} from "@/controllers/productController";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/rbac";
import { requireStoreAccess } from "@/middleware/storeAccess";
import { Router } from "express";

const router = Router();
const ownsStore = [
  requireAuth,
  requireRole(["STORE_OWNER"]),
  requireStoreAccess("header"),
];

// Owner inventory. The store comes from the X-Store-ID header and must belong to the caller.
router.get("/", ...ownsStore, getStoreProducts);
router.post("/", ...ownsStore, createOwnerProduct);
router.post("/import", ...ownsStore, importOwnerProducts);

// Public product detail.
router.get("/:productId", getProductById);
router.patch("/:productId", ...ownsStore, updateOwnerProduct);
router.put("/:productId", ...ownsStore, updateOwnerProduct);
router.delete("/:productId", ...ownsStore, deleteOwnerProduct);

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
