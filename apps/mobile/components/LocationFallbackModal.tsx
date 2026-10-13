import { BottomSheet, Button, FormTextField } from "@/components/ui";
import { POSTAL_CODE_PATTERN } from "@/constants";
import {
  PostalCodeError,
  resolvePostalCode,
  setManualLocation,
} from "@/utils/location";
import { FormikProvider, useFormik } from "formik";
import { useEffect } from "react";
import * as Yup from "yup";

type Props = {
  visible: boolean;
  // Called after a location was saved, or when the shopper chooses Not now.
  onClose: () => void;
  // Why the sheet is open, shown above the input.
  reason?: "denied" | "manual";
};

const MESSAGES: Record<string, string> = {
  invalid: "Enter a valid ZIP or postal code.",
  not_found: "We couldn't find that ZIP code. Check it and try again.",
  unavailable: "Couldn't look up that code. Check your connection.",
};

const schema = Yup.object({
  code: Yup.string()
    .trim()
    .matches(POSTAL_CODE_PATTERN, MESSAGES.invalid)
    .required(MESSAGES.invalid),
});

export default function LocationFallbackModal({
  visible,
  onClose,
  reason = "denied",
}: Props) {
  const formik = useFormik({
    initialValues: { code: "" },
    validationSchema: schema,
    validateOnChange: false,
    onSubmit: async ({ code }, helpers) => {
      try {
        await setManualLocation(await resolvePostalCode(code));
        helpers.resetForm();
        onClose();
      } catch (err) {
        helpers.setFieldError(
          "code",
          err instanceof PostalCodeError
            ? MESSAGES[err.reason]
            : "Something went wrong. Please try again.",
        );
      }
    },
  });

  const { resetForm } = formik;
  useEffect(() => {
    if (visible) resetForm();
  }, [visible, resetForm]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dismissible={!formik.isSubmitting}
      testID="zip-sheet"
      title={
        reason === "denied" ? "Location is turned off" : "Set your location"
      }
      description={
        reason === "denied"
          ? "Enter your ZIP code and we'll show stores near it. You can allow location access any time in your phone's settings."
          : "Enter a ZIP code to see stores and prices near it."
      }
    >
      <FormikProvider value={formik}>
        <FormTextField
          name="code"
          testID="zip-input"
          label="ZIP code"
          placeholder="ZIP code"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={() => formik.handleSubmit()}
        />
        <Button
          testID="zip-submit"
          title="Use this location"
          loading={formik.isSubmitting}
          onPress={() => formik.handleSubmit()}
        />
        <Button
          testID="zip-dismiss"
          variant="ghost"
          title={reason === "denied" ? "Not now" : "Cancel"}
          onPress={onClose}
          disabled={formik.isSubmitting}
        />
      </FormikProvider>
    </BottomSheet>
  );
}
