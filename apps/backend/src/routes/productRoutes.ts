import {
  getStoreProducts,
  verifyProductStock,
} from "@/controllers/productController";
import { Router } from "express";

const router = Router();

router.get("/", getStoreProducts);
router.patch("/:productId/verify", verifyProductStock);

export default router;
