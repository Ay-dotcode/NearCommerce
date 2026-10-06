// LEFT JOIN LATERAL that adds `rating_avg` (one decimal, null when unreviewed) and
// `review_count` for a store alias. Usage: `${storeRatingJoin("s")}`.
export const storeRatingJoin = (storeAlias: string) => `
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(r.rating)::numeric, 1)::float AS rating_avg, COUNT(*)::int AS review_count
      FROM reviews r
     WHERE r.store_id = ${storeAlias}.id
  ) rt ON true`;

export const toRating = (row: {
  rating_avg?: number | null;
  review_count?: number | null;
}) => ({
  rating: row.rating_avg ?? 0,
  review_count: row.review_count ?? 0,
});
