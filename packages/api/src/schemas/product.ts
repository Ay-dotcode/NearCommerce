import { z } from "zod";

export const ProductResponseSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  quantity: z.number(),
  image_url: z.string().url().nullable(),
  is_published: z.boolean(),
  last_verified_at: z.string().datetime(),
  isStale: z.boolean(),
});

export const ConfirmStockParamsSchema = z.object({
  productId: z.string().uuid(),
});
