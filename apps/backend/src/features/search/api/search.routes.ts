import {
  searchByImage,
  searchProducts,
  searchStores,
} from "@/features/search/api/search.controller";
import { imageSearchLimiter } from "@/middleware/rateLimiter";
import { Router } from "express";

const searchRouter = Router();

// GET /search?q=milk&lat=35.14&lng=32.83&radius_meters=5000[&category_id=..|subcategory_id=..]
searchRouter.get("/", searchProducts);
// GET /search/stores?lat=35.14&lng=32.83[&q=market&radius_meters=5000]
searchRouter.get("/stores", searchStores);

// POST /search/image { image: <base64>, mime_type, lat, lng[, radius_meters, category_id] }
searchRouter.post("/image", imageSearchLimiter, searchByImage);

export default searchRouter;
