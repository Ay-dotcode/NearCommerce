import { getCategories } from "@/features/catalog/api/category.controller";
import { Router } from "express";

const categoryRouter = Router();

// Public: shoppers browse the tree without signing in.
categoryRouter.get("/", getCategories);

export default categoryRouter;
