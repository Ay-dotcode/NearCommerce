import { MIN_REASON_LENGTH } from "@/constants";

export interface ReasonValues {
  reason: string;
}

export const reasonInitialValues: ReasonValues = { reason: "" };

export const reasonTooShortMessage = `Give a reason of at least ${MIN_REASON_LENGTH} characters.`;

export const isReasonValid = (reason: string) =>
  reason.trim().length >= MIN_REASON_LENGTH;

// Every moderation action needs a written reason (the API rejects anything under 5 characters).
export const validateReason = ({ reason }: ReasonValues) =>
  isReasonValid(reason) ? {} : { reason: reasonTooShortMessage };
