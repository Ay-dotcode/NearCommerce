import {
  isReasonValid,
  reasonInitialValues,
  validateReason,
} from "@/forms/reason.form";
import { useClearFieldError } from "@/forms/useClearFieldError";
import { parseApiError } from "@nearcommerce/api";
import { useFormik } from "formik";
import { useEffect } from "react";

export function useReasonForm(
  open: boolean,
  onConfirm: (reason: string) => Promise<unknown>,
) {
  const formik = useFormik({
    initialValues: reasonInitialValues,
    validate: validateReason,
    validateOnChange: false,
    validateOnBlur: false,
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

  const { resetForm, setFieldError, errors, values } = formik;
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  useClearFieldError("reason", values.reason, errors.reason, setFieldError);

  return {
    formik,
    busy: formik.isSubmitting,
    valid: isReasonValid(formik.values.reason),
  };
}
