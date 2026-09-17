import { verifyProductStock } from "@/controllers/productController";
import { Router } from "express";

const router = Router();

router.patch("/:productId/verify", verifyProductStock);

export default router;
