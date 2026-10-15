import { EMAIL_PATTERN } from "@nearcommerce/helpers";

export interface ForgotPasswordValues {
  email: string;
}

export const forgotPasswordInitialValues: ForgotPasswordValues = { email: "" };

export function validateForgotPassword({ email }: ForgotPasswordValues) {
  if (!email.trim()) return { email: "Email is required" };
  if (!EMAIL_PATTERN.test(email.trim()))
    return { email: "Enter a valid email address" };
  return {};
}
