import { deleteReview, getReviews } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => getReviews(),
  });
  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deleteReview(id, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin-reviews", "admin-audit-logs"],
      }),
  });
  if (query.isLoading)
    return <p className="text-slate-400">Loading reviews...</p>;
  if (query.isError)
    return <p className="text-red-400">Unable to load reviews.</p>;
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
          Content moderation
        </p>
        <h2 className="mt-1 text-3xl font-bold">Reviews</h2>
      </div>
      <div className="space-y-3">
        {query.data?.data.map((review) => (
          <article
            key={review.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4"
          >
            <div>
              <p className="font-medium">
                {"★".repeat(review.rating)}{" "}
                <span className="text-slate-500">by {review.user_id}</span>
              </p>
              <p className="mt-2 text-slate-300">
                {review.comment ?? "No comment"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {review.store_id
                  ? `Store ${review.store_id}`
                  : `Product ${review.product_id}`}
              </p>
            </div>
            <Button
              type="button"
              disabled={mutation.isPending}
              className="border-red-700 text-red-300"
              onClick={() => {
                const reason = window.prompt(
                  "Reason for deleting this review?",
                );
                if (reason?.trim()) mutation.mutate({ id: review.id, reason });
              }}
            >
              Delete review
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
