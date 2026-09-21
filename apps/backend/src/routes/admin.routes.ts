import {
  deleteStore,
  deleteUser,
  listStores,
  listUsers,
  toggleStoreSuspension,
  toggleUserSuspension,
} from "@/controllers/admin.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/rbac";
import { Router } from "express";

const router = Router();

router.use(requireAuth, requireRole("SYSTEM_ADMIN"));
router.get("/users", listUsers);
router.get("/stores", listStores);
router.patch("/users/:userId/suspend", toggleUserSuspension);
router.patch("/stores/:storeId/suspension", toggleStoreSuspension);
router.patch("/stores/:storeId/suspend", toggleStoreSuspension);
router.delete("/users/:userId", deleteUser);
router.delete("/stores/:storeId", deleteStore);

export default router;
