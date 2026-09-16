import { Router } from "express";
import { searchProducts } from "./search.controller";

const searchRouter = Router();

// GET /search?q=milk&lat=35.14&lng=32.83&radius_meters=5000
searchRouter.get("/", searchProducts);

export default searchRouter;
