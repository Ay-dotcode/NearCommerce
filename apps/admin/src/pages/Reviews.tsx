import { deleteReview, getReviews } from "@/api/admin";
import { ReasonDialog } from "@/components/ReasonDialog";
import type { AdminReview } from "@/types/admin";
import { Button } from "@nearcommerce/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Reviews() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminReview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-reviews", page],
    queryFn: () => getReviews(page),
  });

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deleteReview(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setNotice("Review deleted. Its content is kept in the audit log.");
      setTarget(null);
    },
  });

  const reviews = query.data?.data ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil(
      (query.data?.pagination.total ?? 0) /
        (query.data?.pagination.limit ?? 20),
    ),
  );

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
          Content moderation
        </p>
        <h2 className="mt-1 text-3xl font-bold">Reviews</h2>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-300"
        >
          {notice}
        </p>
      )}

      {query.isLoading ? (
        <p className="text-slate-400">Loading reviews…</p>
      ) : query.isError ? (
        <p role="alert" className="text-red-400">
          Unable to load reviews.
        </p>
      ) : reviews.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
          No reviews yet.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span
                    role="img"
                    aria-label={`${review.rating} out of 5 stars`}
                    className="text-amber-400"
                  >
                    {"★".repeat(review.rating)}
                    <span className="text-slate-700">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </span>{" "}
                  <span className="text-slate-500">
                    by {review.reviewer_name} ({review.reviewer_email})
                  </span>
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-slate-300">
                  {review.comment ?? "No comment"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {review.target_type === "STORE" ? "Store" : "Product"}:{" "}
                  {review.target_name ?? "(deleted)"} ·{" "}
                  {new Date(review.created_at).toLocaleString()}
                  {review.updated_at && " · edited"}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setNotice(null);
                  setTarget(review);
                }}
              >
                Delete review
              </Button>
            </article>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {target && (
        <ReasonDialog
          open
          title="Delete this review?"
          description={`This permanently removes ${target.reviewer_name}'s review. Its content is kept in the audit log.`}
          confirmLabel="Delete review"
          busyLabel="Deleting…"
          onClose={() => setTarget(null)}
          onConfirm={(reason) => remove.mutateAsync({ id: target.id, reason })}
        />
      )}
    </section>
  );
}
