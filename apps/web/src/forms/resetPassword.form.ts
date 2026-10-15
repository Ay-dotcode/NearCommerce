import { PASSWORD_MIN_LENGTH } from "@/forms/register.form";

export interface ResetPasswordValues {
  password: string;
  confirm: string;
}

export const resetPasswordInitialValues: ResetPasswordValues = {
  password: "",
  confirm: "",
};

export function validateResetPassword({
  password,
  confirm,
}: ResetPasswordValues) {
  const errors: Partial<ResetPasswordValues> = {};
  if (!password) errors.password = "Password is required";
  else if (password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (!confirm) errors.confirm = "Please confirm your password";
  else if (confirm !== password) errors.confirm = "Passwords do not match";
  return errors;
}
