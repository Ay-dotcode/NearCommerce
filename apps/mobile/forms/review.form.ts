import { COMMENT_MAX } from "@/constants";
import * as Yup from "yup";

export interface ReviewValues {
  rating: number;
  comment: string;
}

export const reviewSchema = Yup.object({
  rating: Yup.number().min(1, "Choose a rating from 1 to 5 stars."),
  comment: Yup.string().max(COMMENT_MAX),
});

// Blank for a new review; the existing rating and comment (from the screen params) for an edit.
export const reviewInitialValues = (params: {
  rating?: string;
  comment?: string;
}): ReviewValues => ({
  rating: Number(params.rating) || 0,
  comment: params.comment ?? "",
});

// The form-level message for a failed save (shown inside the form, not in a pop-up).
export function reviewErrorMessage(
  err: unknown,
  fallback: (err: unknown) => string,
): string {
  const response = (err as { response?: { status?: number } })?.response;
  if (response?.status === 409)
    return "You've already reviewed this. Open your review and choose Edit.";
  return fallback(err);
}
