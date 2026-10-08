import { apiErrorMessage } from "@/api/errors";
import { createReview, reviewsKey, updateReview } from "@/api/reviews";
import { StarPicker } from "@/components/StarRating";
import { COMMENT_MAX } from "@/constants";
import type { ReviewTarget } from "@/types/reviews";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// One screen for writing and editing. Params: storeId or productId, and for an
// edit also reviewId, rating and comment.
export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    storeId?: string;
    productId?: string;
    reviewId?: string;
    rating?: string;
    comment?: string;
  }>();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params.reviewId);
  const [rating, setRating] = useState(Number(params.rating) || 0);
  const [comment, setComment] = useState(params.comment ?? "");
  const [error, setError] = useState<string | null>(null);

  const target: ReviewTarget | null = params.storeId
    ? { storeId: params.storeId }
    : params.productId
      ? { productId: params.productId }
      : null;

  const save = useMutation({
    mutationFn: async () => {
      const text = comment.trim();
      if (isEdit)
        return updateReview(params.reviewId!, {
          rating,
          comment: text || null,
        });
      return createReview(target!, { rating, comment: text || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsKey(target!) });
      queryClient.invalidateQueries({
        queryKey: [
          "storeId" in target! ? "store" : "product",
          "storeId" in target! ? target.storeId : target!.productId,
        ],
      });
      Toast.show({
        type: "success",
        text1: isEdit ? "Review updated" : "Thanks for your review",
      });
      router.back();
    },
    onError: (err) => {
      const response = (
        err as {
          response?: { status?: number; data?: { code?: string } };
        }
      )?.response;
      const status = response?.status;
      setError(
        response?.data?.code === "EMAIL_NOT_VERIFIED"
          ? "Verify your email to submit reviews. You can resend the link from Settings."
          : status === 409
            ? "You've already reviewed this. Open your review and choose Edit."
            : apiErrorMessage(err, "Couldn't save your review."),
      );
    },
  });

  if (!target)
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Text style={styles.muted}>Nothing to review here.</Text>
      </SafeAreaView>
    );

  const submit = () => {
    if (rating < 1) return setError("Choose a rating from 1 to 5 stars.");
    setError(null);
    save.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Text style={styles.title}>
        {isEdit ? "Edit your review" : "Write a review"}
      </Text>
      <StarPicker value={rating} onChange={setRating} />
      <TextInput
        style={styles.input}
        placeholder="Share details about your experience (optional)"
        placeholderTextColor="#9ca3af"
        multiline
        maxLength={COMMENT_MAX}
        value={comment}
        onChangeText={setComment}
        accessibilityLabel="Review comment"
      />
      <Text style={styles.muted}>
        {comment.length}/{COMMENT_MAX}
      </Text>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <View style={styles.footer}>
        <Pressable
          style={[styles.button, save.isPending && styles.disabled]}
          onPress={submit}
          disabled={save.isPending}
          accessibilityRole="button"
        >
          {save.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isEdit ? "Save changes" : "Submit review"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", gap: 12 },
  title: { fontSize: 22, fontWeight: "bold", color: "#123047" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    minHeight: 110,
    textAlignVertical: "top",
    color: "#123047",
  },
  muted: { color: "#718096", fontSize: 12, textAlign: "right" },
  error: { color: "#b91c1c" },
  footer: { marginTop: "auto" },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
