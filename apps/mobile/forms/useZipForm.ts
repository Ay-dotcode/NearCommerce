import { ZIP_MESSAGES, zipInitialValues, zipSchema } from "@/forms/zip.form";
import {
  PostalCodeError,
  resolvePostalCode,
  setManualLocation,
} from "@/helpers/location";

// Looks the ZIP code up and, if it is real, makes it the shopper's location.
async function setManualLocationFromZip(code: string) {
  const location = await resolvePostalCode(code);
  await setManualLocation(location);
  return location;
}
import { notify } from "@/helpers/notify";
import { useFormik } from "formik";
import { useEffect } from "react";

// Formik state for "set my location by ZIP code". Resets whenever the sheet opens, saves the
// location on success, and shows lookup problems under the field.
export function useZipForm(visible: boolean, onDone: () => void) {
  const formik = useFormik({
    initialValues: zipInitialValues,
    validationSchema: zipSchema,
    validateOnChange: false,
    onSubmit: async ({ code }, helpers) => {
      try {
        const location = await setManualLocationFromZip(code);
        helpers.resetForm();
        onDone();
        notify.success(
          "Location updated",
          `Showing shops near ZIP code ${location.postalCode}.`,
        );
      } catch (err) {
        helpers.setFieldError(
          "code",
          err instanceof PostalCodeError
            ? ZIP_MESSAGES[err.reason]
            : "Something went wrong. Please try again.",
        );
      }
    },
  });

  const { resetForm } = formik;
  useEffect(() => {
    if (visible) resetForm();
  }, [visible, resetForm]);

  return formik;
}
