import { EMAIL_PATTERN } from "@nearcommerce/helpers";
import * as Yup from "yup";

export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .trim()
    .matches(EMAIL_PATTERN, "Enter a valid email address.")
    .required("Enter a valid email address."),
});

export const forgotPasswordInitialValues = { email: "" };
