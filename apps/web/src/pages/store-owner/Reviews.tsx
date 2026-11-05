import { listProductReviews } from "@/api/reviews";
import { ReviewsPageSkeleton } from "@/features/reviews/ui/ReviewsSkeleton";
import { StarRating } from "@/features/reviews/ui/StarRating";
import { parseApiError, STORE_KEY } from "@nearcommerce/api";
import { Button, EmptyState } from "@nearcommerce/ui";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

const PAGE_SIZE = 10;

export default function StoreReviews() {
  const storeId = localStorage.getItem(STORE_KEY) ?? "";
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["owner-product-reviews", storeId, page],
    queryFn: () => listProductReviews(storeId, page, PAGE_SIZE),
    enabled: Boolean(storeId),
    placeholderData: keepPreviousData,
  });

  if (query.isLoading) return <ReviewsPageSkeleton />;

  const reviews = query.data?.data ?? [];
  const summary = query.data?.summary;
  const total = query.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Product reviews
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          What shoppers say about the products in your store.
        </p>
      </header>

      {query.isError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {parseApiError(query.error, "We couldn't load your reviews.").message}
        </p>
      )}

      {summary && summary.review_count > 0 && (
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="text-center">
            <p className="text-4xl font-semibold tabular-nums">
              {summary.rating.toFixed(1)}
            </p>
            <StarRating
              rating={summary.rating}
              className="text-xl text-amber-700"
            />
            <p className="mt-1 text-sm text-slate-600">
              {summary.review_count} review
              {summary.review_count === 1 ? "" : "s"}
            </p>
          </div>
          <dl
            aria-label="Ratings breakdown"
            className="min-w-[12rem] flex-1 space-y-1.5"
          >
            {(["5", "4", "3", "2", "1"] as const).map((star) => (
              <div key={star} className="flex items-center gap-2 text-sm">
                <dt className="w-10 shrink-0 text-slate-600">{star} ★</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full bg-amber-500"
                      style={{
                        width: `${(summary.distribution[star] / summary.review_count) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-6 text-right tabular-nums text-slate-600">
                    {summary.distribution[star]}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!query.isError && total === 0 && (
        <EmptyState
          title="No reviews yet"
          description="When shoppers review your products, you will see their ratings and comments here."
        />
      )}

      {reviews.length > 0 && (
        <ul aria-label="Product reviews" className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="font-medium text-slate-900">
                  {review.product_name}
                </p>
                <StarRating rating={review.rating} />
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">
                {review.comment ?? (
                  <span className="text-slate-500">No comment</span>
                )}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {review.reviewer_name} ·{" "}
                {new Date(review.created_at).toLocaleDateString()}
                {review.updated_at && " · edited"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"
        >
          <p>
            Showing {firstShown}–{lastShown} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span aria-live="polite">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </section>
  );
}
