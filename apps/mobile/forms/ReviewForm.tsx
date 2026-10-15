import { apiErrorMessage } from "@/api/errors";
import { createReview, reviewsKey, updateReview } from "@/api/reviews";
import { StarPicker } from "@/components/StarRating";
import { Button, FormError, FormTextField } from "@/components/ui";
import { COMMENT_MAX } from "@/constants";
import {
  reviewErrorMessage,
  reviewInitialValues,
  reviewSchema,
} from "@/forms/review.form";
import { useThemedStyles, type ThemeColors } from "@/theme";
import type { ReviewTarget } from "@/types/reviews";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { FormikProvider, useFormik } from "formik";
import { StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

interface Props {
  target: ReviewTarget;
  // Set when editing an existing review.
  reviewId?: string;
  rating?: string;
  comment?: string;
}

// Write or edit a review: star rating plus an optional comment.
export function ReviewForm({ target, reviewId, rating, comment }: Props) {
  const styles = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();
  const isEdit = Boolean(reviewId);

  const formik = useFormik({
    initialValues: reviewInitialValues({ rating, comment }),
    validationSchema: reviewSchema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      const text = values.comment.trim();
      try {
        if (isEdit)
          await updateReview(reviewId!, {
            rating: values.rating,
            comment: text || null,
          });
        else
          await createReview(target, {
            rating: values.rating,
            comment: text || undefined,
          });
        queryClient.invalidateQueries({ queryKey: reviewsKey(target) });
        queryClient.invalidateQueries({
          queryKey: [
            "storeId" in target ? "store" : "product",
            "storeId" in target ? target.storeId : target.productId,
          ],
        });
        Toast.show({
          type: "success",
          text1: isEdit ? "Review updated" : "Thanks for your review",
        });
        router.back();
      } catch (err) {
        helpers.setStatus({
          form: reviewErrorMessage(err, (e) =>
            apiErrorMessage(e, "Couldn't save your review."),
          ),
        });
      }
    },
  });

  const ratingError =
    formik.touched.rating || formik.submitCount > 0
      ? (formik.errors.rating as string | undefined)
      : undefined;

  return (
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
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: { fontSize: 22, fontWeight: "bold", color: c.text },
    input: { minHeight: 110, textAlignVertical: "top" },
    muted: { color: c.textMuted, fontSize: 12, textAlign: "right" },
    error: { color: c.danger, fontWeight: "600" },
    footer: { marginTop: "auto" },
  });
