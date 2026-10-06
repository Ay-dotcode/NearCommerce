import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/features/favorites/services/favorite.service";
import { fail, isUuid, sendValidationError } from "@/utils/http";
import { AddFavoriteSchema, ListFavoritesQuerySchema } from "@nearcommerce/api";
import { Request, Response } from "express";

export async function getFavorites(req: Request, res: Response) {
  const query = ListFavoritesQuerySchema.safeParse(req.query);
  if (!query.success) return sendValidationError(res, query.error.issues);
  try {
    return res
      .status(200)
      .json({ data: await listFavorites(req.user!.id, query.data.type) });
  } catch (error) {
    return fail(res, "getFavorites", error);
  }
}

export async function createFavorite(req: Request, res: Response) {
  const parsed = AddFavoriteSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    const { id, created } = await addFavorite(req.user!.id, parsed.data);
    return res.status(created ? 201 : 200).json({
      data: {
        id,
        store_id: parsed.data.store_id ?? null,
        product_id: parsed.data.product_id ?? null,
      },
      already_favorited: !created,
    });
  } catch (error) {
    return fail(res, "createFavorite", error);
  }
}

export async function deleteFavorite(req: Request, res: Response) {
  if (!isUuid(req.params.favoriteId))
    return res.status(404).json({ error: "Favorite not found" });
  try {
    await removeFavorite(req.user!.id, req.params.favoriteId);
    return res.status(204).send();
  } catch (error) {
    return fail(res, "deleteFavorite", error);
  }
}
