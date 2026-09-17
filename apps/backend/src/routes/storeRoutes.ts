import { getStoreDetails } from "@/controllers/storeController";
import { Router } from "express";

const storeRouter = Router();

// GET /api/stores/:storeId and /stores/:storeId
storeRouter.get("/:storeId", getStoreDetails);

export default storeRouter;
