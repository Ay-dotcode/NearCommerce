import { passwordInitialValues, validatePassword } from "@/forms/password.form";
import { parseApiError } from "@nearcommerce/api";
import { useFormik } from "formik";
import { useEffect } from "react";

export function usePasswordConfirmForm(
  open: boolean,
  onConfirm: (password: string, reason?: string) => Promise<unknown>,
) {
  const formik = useFormik({
    initialValues: passwordInitialValues,
    validate: validatePassword,
    validateOnChange: false,
    onSubmit: async ({ password, reason }, helpers) => {
      try {
        await onConfirm(password, reason.trim() || undefined);
      } catch (err) {
        helpers.setFieldError(
          "password",
          parseApiError(err, "That didn't work. Please try again.").message,
        );
      }
    },
  });

  const { resetForm } = formik;
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  return {
    formik,
    busy: formik.isSubmitting,
    valid: formik.values.password.length > 0,
  };
}
