export interface LoginValues {
  email: string;
  password: string;
}

export const loginInitialValues: LoginValues = { email: "", password: "" };

// Both fields are required; the server decides whether the credentials are right.
export function validateLogin(values: LoginValues) {
  const errors: Partial<LoginValues> = {};
  if (!values.email) errors.email = "Required";
  if (!values.password) errors.password = "Required";
  return errors;
}
