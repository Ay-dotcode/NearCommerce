import { passwordInitialValues, validatePassword } from "@/forms/password.form";
import { parseApiError } from "@nearcommerce/api";
import { useFormik } from "formik";
import { useEffect } from "react";

// Formik state for "type your own password, then run the action". The form starts empty every
// time the dialog opens; a thrown error from `onConfirm` (for example a wrong password) is
// shown under the field.
export function usePasswordConfirmForm(
  open: boolean,
  onConfirm: (password: string) => Promise<unknown>,
) {
  const formik = useFormik({
    initialValues: passwordInitialValues,
    validate: validatePassword,
    validateOnChange: false,
    onSubmit: async ({ password }, helpers) => {
      try {
        await onConfirm(password);
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
