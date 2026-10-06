export type ReviewTarget = { storeId: string } | { productId: string };

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  reviewer_name: string;
  is_mine: boolean;
};

export type ReviewSummary = {
  rating: number;
  review_count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type ReviewPage = {
  data: Review[];
  summary: ReviewSummary;
  pagination: { page: number; limit: number; total: number };
};
