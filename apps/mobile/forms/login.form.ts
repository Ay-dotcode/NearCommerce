import * as Yup from "yup";

export const loginSchema = Yup.object({
  email: Yup.string().trim().required("Enter your email."),
  password: Yup.string().required("Enter your password."),
});

export const loginInitialValues = { email: "", password: "" };
