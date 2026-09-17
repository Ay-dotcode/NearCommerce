import {
  deleteStore,
  toggleStoreSuspension,
} from "@/controllers/adminController";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/rbac";
import { Router } from "express";

const router = Router();

// Apply auth and strict admin role checking to all admin routes
router.use(requireAuth, requireRole("SYSTEM_ADMIN"));

router.patch("/stores/:storeId/suspension", toggleStoreSuspension);
router.delete("/stores/:storeId", deleteStore);

export default router;
