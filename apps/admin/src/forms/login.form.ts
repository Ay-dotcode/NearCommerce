import * as Yup from "yup";

export interface LoginValues {
  email: string;
  password: string;
}

export const loginInitialValues: LoginValues = { email: "", password: "" };

export const loginSchema = Yup.object({
  email: Yup.string()
    .trim()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

export const ACCESS_DENIED_MESSAGE =
  "Access denied. This portal is for System Admins only.";
