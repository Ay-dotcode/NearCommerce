import {
  deleteReview,
  deleteStore,
  deleteUser,
  demoteAdmin,
  getGlobalMetrics,
  listAuditLogs,
  listReviews,
  listStores,
  listUsers,
  toggleStoreSuspension,
  toggleUserSuspension,
} from "@/controllers/admin.controller";
import {
  adminCreateCategory,
  adminCreateSubcategory,
  adminDeleteCategory,
  adminDeleteSubcategory,
  adminListCategories,
  adminUpdateCategory,
  adminUpdateSubcategory,
} from "@/features/catalog/api/category.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireLiveRole } from "@/middleware/liveRole";
import { requireRole } from "@/middleware/rbac";
import { Router } from "express";

const router = Router();

// The live check re-reads the role, so a demoted admin is locked out at once.
router.use(
  requireAuth,
  requireRole("SYSTEM_ADMIN"),
  requireLiveRole("SYSTEM_ADMIN"),
);
router.get("/metrics", getGlobalMetrics);
router.get("/users", listUsers);
router.get("/audit-logs", listAuditLogs);
router.get("/reviews", listReviews);
router.delete("/reviews/:reviewId", deleteReview);
router.get("/stores", listStores);
router.patch("/users/:userId/suspend", toggleUserSuspension);
router.patch("/stores/:storeId/suspension", toggleStoreSuspension);
router.patch("/stores/:storeId/suspend", toggleStoreSuspension);
router.patch("/users/:userId/demote", demoteAdmin);
router.delete("/users/:userId", deleteUser);
router.delete("/stores/:storeId", deleteStore);

// Category & subcategory administration (SRS 4.3 / Implementation 4.3).
router.get("/categories", adminListCategories);
router.post("/categories", adminCreateCategory);
router.patch("/categories/:categoryId", adminUpdateCategory);
router.delete("/categories/:categoryId", adminDeleteCategory);
router.post("/categories/:categoryId/subcategories", adminCreateSubcategory);
router.patch("/subcategories/:subcategoryId", adminUpdateSubcategory);
router.delete("/subcategories/:subcategoryId", adminDeleteSubcategory);

export default router;
