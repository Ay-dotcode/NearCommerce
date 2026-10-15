import { EMAIL_PATTERN } from "@nearcommerce/helpers";

export interface RegisterValues {
  full_name: string;
  email: string;
  password: string;
}

export const registerInitialValues: RegisterValues = {
  full_name: "",
  email: "",
  password: "",
};

export const PASSWORD_MIN_LENGTH = 8;

export function validateRegister(values: RegisterValues) {
  const errors: Partial<RegisterValues> = {};
  if (!values.full_name.trim()) errors.full_name = "Full name is required";
  else if (values.full_name.trim().length < 2)
    errors.full_name = "Full name must be at least 2 characters";

  if (!values.email) errors.email = "Email is required";
  else if (!EMAIL_PATTERN.test(values.email))
    errors.email = "Invalid email address";

  if (!values.password) errors.password = "Password is required";
  else if (values.password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  return errors;
}
