import { apiErrorMessage } from "@/api/errors";
import {
  deleteReview,
  fetchReviews,
  reviewsKey,
  targetId,
} from "@/api/reviews";
import { Stars } from "@/components/StarRating";
import type { Review, ReviewTarget } from "@/types/reviews";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { ReviewsSkeleton } from "@/components/skeletons";
import { Skeleton, useDialogs } from "@/components/ui";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";

type Props = { target: ReviewTarget };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function ReviewsSection({ target }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { confirm } = useDialogs();
  const c = useColors();

  const queryClient = useQueryClient();
  const key = reviewsKey(target);

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchReviews(target, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page * last.pagination.limit < last.pagination.total
        ? last.pagination.page + 1
        : undefined,
  });

  const remove = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      // The store or product screen also shows the average, so refresh both.
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({
        queryKey: ["storeId" in target ? "store" : "product", targetId(target)],
      });
      Toast.show({ type: "success", text1: "Review deleted" });
    },
    onError: (error) =>
      Toast.show({
        type: "error",
        text1: "Couldn't delete review",
        text2: apiErrorMessage(error, "Please try again."),
      }),
  });

  const openEditor = (review?: Review) =>
    router.push({
      pathname: "/review",
      params: {
        ...target,
        ...(review && {
          reviewId: review.id,
          rating: String(review.rating),
          comment: review.comment ?? "",
        }),
      },
    });

  const confirmDelete = async (review: Review) => {
    const ok = await confirm({
      title: "Delete your review?",
      message: "This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) remove.mutate(review.id);
  };

  if (query.isLoading) return <ReviewsSkeleton />;

  if (query.isError)
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Reviews</Text>
        <Text style={styles.muted}>Couldn't load reviews.</Text>
        <Pressable onPress={() => query.refetch()} accessibilityRole="button">
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </View>
    );

  const pages = query.data?.pages ?? [];
  const summary = pages[0]?.summary;
  const reviews = pages.flatMap((p) => p.data);
  const mine = reviews.find((r) => r.is_mine);
  const total = summary?.review_count ?? 0;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Reviews</Text>

      {summary && total > 0 ? (
        <View style={styles.summary}>
          <View style={styles.summaryScore}>
            <Text style={styles.score}>{summary.rating.toFixed(1)}</Text>
            <Stars rating={summary.rating} />
            <Text style={styles.muted}>
              {total} review{total === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.bars}>
            {(["5", "4", "3", "2", "1"] as const).map((star) => (
              <View key={star} style={styles.barRow}>
                <Text style={styles.barLabel}>{star}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(summary.distribution[star] / total) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.muted}>No reviews yet. Be the first to share.</Text>
      )}

      {!mine && (
        <Pressable
          style={styles.writeButton}
          onPress={() => openEditor()}
          accessibilityRole="button"
        >
          <Text style={styles.writeText}>Write a review</Text>
        </Pressable>
      )}

      {reviews.map((review) => (
        <View key={review.id} style={styles.review}>
          <View style={styles.reviewHeader}>
            <Stars rating={review.rating} size={14} />
            <Text style={styles.muted}>
              {review.is_mine ? "You" : review.reviewer_name} ·{" "}
              {formatDate(review.created_at)}
              {review.updated_at ? " (edited)" : ""}
            </Text>
          </View>
          {review.comment ? (
            <Text style={styles.comment}>{review.comment}</Text>
          ) : null}
          {review.is_mine && (
            <View style={styles.actions}>
              <Pressable
                onPress={() => openEditor(review)}
                accessibilityRole="button"
                accessibilityLabel="Edit your review"
              >
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(review)}
                disabled={remove.isPending}
                accessibilityRole="button"
                accessibilityLabel="Delete your review"
              >
                <Text style={styles.danger}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {query.hasNextPage && (
        <Pressable
          onPress={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          accessibilityRole="button"
        >
          {query.isFetchingNextPage ? (
            <Skeleton width={140} height={18} style={{ alignSelf: "center" }} />
          ) : (
            <Text style={styles.link}>
              {`Show more (${total - reviews.length} more)`}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { marginTop: 24, gap: 12 },
    loader: { marginTop: 24 },
    heading: { fontSize: 18, fontWeight: "600", color: c.text },
    muted: { color: c.textMuted, fontSize: 13 },
    summary: { flexDirection: "row", gap: 20, alignItems: "center" },
    summaryScore: { alignItems: "center", gap: 4 },
    score: { fontSize: 32, fontWeight: "800", color: c.text },
    bars: { flex: 1, gap: 4 },
    barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    barLabel: { width: 12, color: c.textMuted, fontSize: 12 },
    barTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
      overflow: "hidden",
    },
    barFill: { height: 6, backgroundColor: c.star },
    writeButton: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    writeText: { color: c.primary, fontWeight: "700" },
    review: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 12,
      gap: 6,
    },
    reviewHeader: { gap: 4 },
    comment: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: "row", gap: 16, marginTop: 4 },
    link: { color: c.primary, fontWeight: "700" },
    danger: { color: c.danger, fontWeight: "700" },
  });
