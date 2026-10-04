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

// ---------------------------------------------------------------------------
// Owner-side product management
// ---------------------------------------------------------------------------

// DECIMAL(10, 2) ceiling.
export const MAX_PRODUCT_PRICE = 99_999_999.99;
export const MAX_PRODUCT_QUANTITY = 1_000_000;
// Hard cap on rows accepted by a single CSV import request.
export const IMPORT_MAX_ROWS = 1000;

const priceSchema = z
  .number({ invalid_type_error: "Price must be a number" })
  .positive("Price must be greater than zero")
  .max(MAX_PRODUCT_PRICE, "Price is too large")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
    message: "Price can have at most 2 decimal places",
  });

const quantitySchema = z
  .number({ invalid_type_error: "Quantity must be a number" })
  .int("Quantity must be a whole number")
  .nonnegative("Quantity cannot be negative")
  .max(MAX_PRODUCT_QUANTITY, "Quantity is too large");

const imageUrlSchema = z
  .string()
  .trim()
  .url("Invalid image URL")
  .max(512)
  .refine((u) => /^https?:\/\//i.test(u), "Image URL must be http(s)");

const ProductFieldsShape = {
  subcategoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2, "Product name is required").max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  price: priceSchema,
  quantity: quantitySchema,
  imageUrl: imageUrlSchema.nullable().optional(),
  isPublished: z.boolean(),
};

const PUBLISH_IMAGE_MESSAGE = "Product cannot be published without an image";

export const CreateProductSchema = z
  .object({
    ...ProductFieldsShape,
    quantity: ProductFieldsShape.quantity.default(0),
    isPublished: ProductFieldsShape.isPublished.default(false),
  })
  // Mirrors the publish_image_check constraint in the database.
  .refine((data) => !data.isPublished || Boolean(data.imageUrl), {
    message: PUBLISH_IMAGE_MESSAGE,
    path: ["isPublished"],
  });

export const UpdateProductSchema = z
  .object(ProductFieldsShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

// One CSV row, in the snake_case shape the web CSV importer sends.
export const ImportProductRowSchema = z.object({
  name: ProductFieldsShape.name,
  description: z.string().trim().max(5000).nullable().optional(),
  price: priceSchema,
  quantity: quantitySchema,
  image_url: imageUrlSchema.nullable().optional(),
  is_published: z.boolean().optional(),
});

export const ImportProductsBodySchema = z.object({
  products: z
    .array(z.unknown())
    .min(1, "The import contains no products")
    .max(IMPORT_MAX_ROWS, `Import at most ${IMPORT_MAX_ROWS} products at once`),
});

export const PRODUCT_STATUS_FILTERS = [
  "all",
  "published",
  "draft",
  "stale",
  "out_of_stock",
] as const;

export const ProductListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUS_FILTERS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ImportProductRow = z.infer<typeof ImportProductRowSchema>;
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;
