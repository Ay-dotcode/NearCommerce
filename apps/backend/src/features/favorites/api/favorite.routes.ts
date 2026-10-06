import {
  createFavorite,
  deleteFavorite,
  getFavorites,
} from "@/features/favorites/api/favorite.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { Router } from "express";

const favoriteRouter = Router();

// Every favorites route is private to the signed-in user.
favoriteRouter.use(requireAuth);
favoriteRouter.get("/", getFavorites);
favoriteRouter.post("/", createFavorite);
favoriteRouter.delete("/:favoriteId", deleteFavorite);

export default favoriteRouter;
