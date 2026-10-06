import { z } from "zod";

// Categories & subcategories (public browse + System Admin CRUD)

export const CATEGORY_NAME_MAX = 100;

const categoryName = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(
    CATEGORY_NAME_MAX,
    `Name must be at most ${CATEGORY_NAME_MAX} characters`,
  );

const iconUrl = z
  .string()
  .trim()
  .max(512, "Icon URL is too long")
  .refine((u) => /^https?:\/\/\S+$/i.test(u), "Icon URL must be http(s)");

export const UpdateCategorySchema = z
  .object({
    name: categoryName,
    iconUrl: iconUrl.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

export const UpdateSubcategorySchema = z.object({ name: categoryName });

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// Favorites

// Per-user cap, so the favorites list can always be loaded in one request.
export const FAVORITES_MAX = 500;

export const FAVORITE_TYPES = ["store", "product"] as const;

export const AddFavoriteSchema = z
  .object({
    store_id: z.string().uuid("store_id must be a valid id").optional(),
    product_id: z.string().uuid("product_id must be a valid id").optional(),
  })
  .refine((d) => Boolean(d.store_id) !== Boolean(d.product_id), {
    message: "Provide exactly one of store_id or product_id",
    path: ["store_id"],
  });

export const ListFavoritesQuerySchema = z.object({
  type: z.enum(FAVORITE_TYPES).optional(),
});

export type AddFavoriteInput = z.infer<typeof AddFavoriteSchema>;
