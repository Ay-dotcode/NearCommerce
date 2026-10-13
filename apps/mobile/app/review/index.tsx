import { apiErrorMessage } from "@/api/errors";
import { createReview, reviewsKey, updateReview } from "@/api/reviews";
import { StarPicker } from "@/components/StarRating";
import { Button, FormError, FormTextField } from "@/components/ui";
import { COMMENT_MAX } from "@/constants";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { STACK_SCREEN_EDGES } from "@/theme/layout";
import type { ReviewTarget } from "@/types/reviews";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as Yup from "yup";

const schema = Yup.object({
  rating: Yup.number().min(1, "Choose a rating from 1 to 5 stars."),
  comment: Yup.string().max(COMMENT_MAX),
});

// One screen for writing and editing. Params: storeId or productId, and for an
// edit also reviewId, rating and comment.
export default function ReviewScreen() {
  const styles = useThemedStyles(makeStyles);

  const params = useLocalSearchParams<{
    storeId?: string;
    productId?: string;
    reviewId?: string;
    rating?: string;
    comment?: string;
  }>();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params.reviewId);

  const target: ReviewTarget | null = params.storeId
    ? { storeId: params.storeId }
    : params.productId
      ? { productId: params.productId }
      : null;

  const formik = useFormik({
    initialValues: {
      rating: Number(params.rating) || 0,
      comment: params.comment ?? "",
    },
    validationSchema: schema,
    validateOnChange: false,
    onSubmit: async ({ rating, comment }, helpers) => {
      helpers.setStatus(undefined);
      const text = comment.trim();
      try {
        if (isEdit)
          await updateReview(params.reviewId!, {
            rating,
            comment: text || null,
          });
        else
          await createReview(target!, { rating, comment: text || undefined });
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
      } catch (err) {
        const response = (
          err as {
            response?: { status?: number; data?: { code?: string } };
          }
        )?.response;
        // Shown inside the form, not in a pop-up.
        helpers.setStatus({
          form:
            response?.data?.code === "EMAIL_NOT_VERIFIED"
              ? "Verify your email to submit reviews. You can resend the link from Settings."
              : response?.status === 409
                ? "You've already reviewed this. Open your review and choose Edit."
                : apiErrorMessage(err, "Couldn't save your review."),
        });
      }
    },
  });

  if (!target)
    return (
      <SafeAreaView style={styles.container} edges={STACK_SCREEN_EDGES}>
        <Text style={styles.muted}>Nothing to review here.</Text>
      </SafeAreaView>
    );

  const ratingError =
    formik.touched.rating || formik.submitCount > 0
      ? (formik.errors.rating as string | undefined)
      : undefined;

  return (
    <SafeAreaView style={styles.container} edges={STACK_SCREEN_EDGES}>
      <FormikProvider value={formik}>
        <Text style={styles.title}>
          {isEdit ? "Edit your review" : "Write a review"}
        </Text>
        <StarPicker
          value={formik.values.rating}
          onChange={(n) => {
            formik.setFieldValue("rating", n);
            formik.setFieldTouched("rating", true, false);
          }}
        />
        {ratingError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {ratingError}
          </Text>
        ) : null}
        <FormTextField
          name="comment"
          accessibilityLabel="Review comment"
          placeholder="Share details about your experience (optional)"
          multiline
          maxLength={COMMENT_MAX}
          style={styles.input}
          containerStyle={{ marginBottom: 0 }}
        />
        <Text style={styles.muted}>
          {formik.values.comment.length}/{COMMENT_MAX}
        </Text>
        <FormError message={formik.status?.form} />
        <View style={styles.footer}>
          <Button
            title={isEdit ? "Save changes" : "Submit review"}
            loading={formik.isSubmitting}
            onPress={() => formik.handleSubmit()}
          />
        </View>
      </FormikProvider>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: c.surface, gap: 12 },
    title: { fontSize: 22, fontWeight: "bold", color: c.text },
    input: { minHeight: 110, textAlignVertical: "top" },
    muted: { color: c.textMuted, fontSize: 12, textAlign: "right" },
    error: { color: c.danger, fontWeight: "600" },
    footer: { marginTop: "auto" },
  });
