import { apiClient } from "@nearcommerce/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StoreReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const submitReview = useMutation({
    mutationFn: async () =>
      apiClient.post("/reviews", {
        store_id: id,
        rating: Number(rating),
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store", id] });
      router.back();
    },
    onError: (error: any) => {
      const msg =
        error.response?.status === 403
          ? "You must verify your email to submit reviews."
          : "Failed to submit review.";
      Alert.alert("Error", msg);
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.title}>Rate this Store</Text>
      <TextInput
        style={styles.input}
        placeholder="Rating (1-5)"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        maxLength={1}
        value={rating}
        onChangeText={setRating}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Leave a comment (optional)"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={4}
        value={comment}
        onChangeText={setComment}
      />
      <Pressable
        style={[styles.button, submitReview.isPending && styles.buttonDisabled]}
        onPress={() => submitReview.mutate()}
        disabled={submitReview.isPending}
      >
        <Text style={styles.buttonText}>
          {submitReview.isPending ? "Submitting..." : "Submit Review"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#123047",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    color: "#123047",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
