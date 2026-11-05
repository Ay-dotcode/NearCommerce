import type { ProductReviewsResponse } from "@/types/reviews";
import { apiClient } from "@nearcommerce/api";

export async function listProductReviews(
  storeId: string,
  page: number,
  limit: number,
): Promise<ProductReviewsResponse> {
  const response = await apiClient.get<ProductReviewsResponse>(
    `/stores/${storeId}/product-reviews`,
    { params: { page, limit } },
  );
  return response.data;
}
