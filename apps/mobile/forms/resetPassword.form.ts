import * as Yup from "yup";

export const resetPasswordSchema = Yup.object({
  token: Yup.string().trim().required("Paste the reset code from your email."),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .required("Password must be at least 8 characters."),
  confirm: Yup.string().oneOf([Yup.ref("password")], "Passwords do not match."),
});

// The reset code is pre-filled when the shopper arrives from the email link.
export const resetPasswordInitialValues = (token?: string) => ({
  token: token ?? "",
  password: "",
  confirm: "",
});
