import { deleteAccount } from "@/controllers/user.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { Router } from "express";

const router = Router();

router.delete("/me", requireAuth, deleteAccount);

export default router;
