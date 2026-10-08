import { deleteAccount, getMe } from "@/controllers/user.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { Router } from "express";

const router = Router();

router.get("/me", requireAuth, getMe);
router.delete("/me", requireAuth, deleteAccount);

export default router;
