// Discriminated union used to address either a store review or a product review.
export type ReviewTarget = { storeId: string } | { productId: string };
