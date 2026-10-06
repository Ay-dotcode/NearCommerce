import { z } from "zod";

export const REVIEW_COMMENT_MAX = 1000;
export const REVIEWS_PAGE_SIZE_MAX = 50;

const rating = z
  .number({ invalid_type_error: "Rating must be a number" })
  .int("Rating must be a whole number")
  .min(1, "Rating must be between 1 and 5")
  .max(5, "Rating must be between 1 and 5");

const comment = z
  .string()
  .trim()
  .max(
    REVIEW_COMMENT_MAX,
    `Comment must be ${REVIEW_COMMENT_MAX} characters or fewer`,
  );

// A review targets exactly one store or one product.
export const CreateReviewSchema = z
  .object({
    storeId: z.string().uuid("storeId must be a valid id").optional(),
    productId: z.string().uuid("productId must be a valid id").optional(),
    rating,
    comment: comment.nullish(),
  })
  .refine((data) => Boolean(data.storeId) !== Boolean(data.productId), {
    message: "Provide either storeId or productId, not both",
    path: ["storeId"],
  });

export const UpdateReviewSchema = z
  .object({
    rating: rating.optional(),
    comment: comment.nullable().optional(),
  })
  .refine((data) => data.rating !== undefined || data.comment !== undefined, {
    message: "Provide a rating or a comment to update",
  });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(REVIEWS_PAGE_SIZE_MAX).default(20),
};

export const ReviewListQuerySchema = z
  .object({
    store_id: z.string().uuid("store_id must be a valid id").optional(),
    product_id: z.string().uuid("product_id must be a valid id").optional(),
    ...pagination,
  })
  .refine((data) => Boolean(data.store_id) !== Boolean(data.product_id), {
    message: "Provide either store_id or product_id",
    path: ["store_id"],
  });

export const MyReviewsQuerySchema = z.object(pagination);

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>;
export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>;
