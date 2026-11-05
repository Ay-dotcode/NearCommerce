export interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  product_id: string;
  product_name: string;
  reviewer_name: string;
}

export interface ReviewSummary {
  rating: number;
  review_count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ProductReviewsResponse {
  data: ProductReview[];
  summary: ReviewSummary;
  pagination: { page: number; limit: number; total: number };
}
