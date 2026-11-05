import { isReasonValid, reasonTooShortMessage } from "@/forms/reason.form";

export interface PasswordValues {
  password: string;
  reason: string;
}

export const passwordInitialValues: PasswordValues = {
  password: "",
  reason: "",
};

export const passwordRequiredMessage = "Enter your password to continue.";

export const validatePassword = ({ password, reason }: PasswordValues) => {
  const errors: Partial<Record<keyof PasswordValues, string>> = {};
  if (password.length === 0) errors.password = passwordRequiredMessage;
  if (reason.trim().length > 0 && !isReasonValid(reason))
    errors.reason = reasonTooShortMessage;
  return errors;
};
