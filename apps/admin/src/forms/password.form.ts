export interface PasswordValues {
  password: string;
}

export const passwordInitialValues: PasswordValues = { password: "" };

export const passwordRequiredMessage = "Enter your password to continue.";

export const validatePassword = ({ password }: PasswordValues) =>
  password.length > 0 ? {} : { password: passwordRequiredMessage };
