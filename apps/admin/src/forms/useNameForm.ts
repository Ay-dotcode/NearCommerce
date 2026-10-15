import { parseName, validateName } from "@/forms/name.form";
import { parseApiError } from "@nearcommerce/api";
import { useFormik } from "formik";
import { useEffect } from "react";

// Formik state for adding or renaming a category or subcategory. The form is reset to
// `initialName` each time the dialog opens; server errors show under the field.
export function useNameForm(
  open: boolean,
  initialName: string,
  onSubmit: (name: string) => Promise<void>,
) {
  const formik = useFormik({
    initialValues: { name: initialName },
    validate: validateName,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      try {
        await onSubmit(parseName(values));
      } catch (err) {
        const parsed = parseApiError(
          err,
          "We couldn't save that. Please try again.",
        );
        helpers.setFieldError(
          "name",
          parsed.details.find((d) => d.path === "name")?.message ??
            parsed.message,
        );
      }
    },
  });

  const { resetForm } = formik;
  useEffect(() => {
    if (open) resetForm({ values: { name: initialName } });
  }, [open, initialName, resetForm]);

  return { formik, busy: formik.isSubmitting };
}
