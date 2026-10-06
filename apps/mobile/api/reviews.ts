import { REVIEWS_PAGE_SIZE } from "@/constants";
import type { ReviewPage, ReviewTarget } from "@/types/reviews";
import { apiClient } from "@nearcommerce/api";

export const reviewsKey = (target: ReviewTarget) =>
  [
    "reviews",
    "storeId" in target ? "store" : "product",
    targetId(target),
  ] as const;

export const targetId = (target: ReviewTarget) =>
  "storeId" in target ? target.storeId : target.productId;

export async function fetchReviews(
  target: ReviewTarget,
  page: number,
): Promise<ReviewPage> {
  const res = await apiClient.get<ReviewPage>("/reviews", {
    params: {
      ...("storeId" in target
        ? { store_id: target.storeId }
        : { product_id: target.productId }),
      page,
      limit: REVIEWS_PAGE_SIZE,
    },
  });
  return res.data;
}

export function createReview(
  target: ReviewTarget,
  input: { rating: number; comment?: string },
) {
  return apiClient.post("/reviews", { ...target, ...input });
}

// An empty comment clears it (the API stores null).
export function updateReview(
  reviewId: string,
  input: { rating: number; comment: string | null },
) {
  return apiClient.patch(`/reviews/${reviewId}`, input);
}

export async function deleteReview(reviewId: string) {
  await apiClient.delete(`/reviews/${reviewId}`);
}
