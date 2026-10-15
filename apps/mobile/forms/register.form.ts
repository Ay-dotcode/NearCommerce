import * as Yup from "yup";

export const registerSchema = Yup.object({
  fullName: Yup.string().trim().required("Enter your full name."),
  email: Yup.string()
    .trim()
    .email("Enter a valid email address.")
    .required("Enter your email."),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .required("Choose a password."),
});

export const registerInitialValues = { fullName: "", email: "", password: "" };
