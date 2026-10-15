import {
  isReasonValid,
  reasonInitialValues,
  validateReason,
} from "@/forms/reason.form";
import { parseApiError } from "@nearcommerce/api";
import { useFormik } from "formik";
import { useEffect } from "react";

// Formik state for "give a reason, then run the action". The form starts empty every time the
// dialog opens; a thrown error from `onConfirm` is shown under the field.
export function useReasonForm(
  open: boolean,
  onConfirm: (reason: string) => Promise<unknown>,
) {
  const formik = useFormik({
    initialValues: reasonInitialValues,
    validate: validateReason,
    validateOnChange: false,
    onSubmit: async ({ reason }, helpers) => {
      try {
        await onConfirm(reason.trim());
      } catch (err) {
        helpers.setFieldError(
          "reason",
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
    valid: isReasonValid(formik.values.reason),
  };
}
