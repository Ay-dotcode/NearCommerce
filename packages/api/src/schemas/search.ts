import { z } from "zod";

// Default proximity search radius (5 km).
export const SEARCH_DEFAULT_RADIUS_METERS = 5000;

export const SearchQuerySchema = z.object({
  q: z.string().optional(), // The search term (e.g., "fresh milk")
  lat: z.coerce
    .number()
    .min(-90)
    .max(90, "Latitude must be between -90 and 90"),
  lng: z.coerce
    .number()
    .min(-180)
    .max(180, "Longitude must be between -180 and 180"),
  radius_meters: z.coerce
    .number()
    .positive()
    .default(SEARCH_DEFAULT_RADIUS_METERS),
});

// Browse drill-down: restrict product search to one subcategory, or to a whole category.
export const ProductSearchQuerySchema = SearchQuerySchema.extend({
  category_id: z.string().uuid("category_id must be a valid id").optional(),
  subcategory_id: z
    .string()
    .uuid("subcategory_id must be a valid id")
    .optional(),
});

// Photo search: the app sends a small base64 JPEG/PNG/WebP, the server asks a vision model
// what product it shows, then searches for that. `q` is not accepted; the photo is the query.
export const IMAGE_SEARCH_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ImageSearchBodySchema = ProductSearchQuerySchema.omit({
  q: true,
}).extend({
  image: z
    .string()
    .min(1, "image is required")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "image must be plain base64"),
  mime_type: z.enum(IMAGE_SEARCH_MIME_TYPES),
});

// Nearby stores for the home screen. `q` narrows by store name.
export const StoreSearchQuerySchema = SearchQuerySchema.pick({
  lat: true,
  lng: true,
  radius_meters: true,
}).extend({
  q: z.string().trim().max(100).optional(),
});

export type ProductSearchQueryInput = z.infer<typeof ProductSearchQuerySchema>;
export type ImageSearchBodyInput = z.infer<typeof ImageSearchBodySchema>;
export type StoreSearchQueryInput = z.infer<typeof StoreSearchQuerySchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
