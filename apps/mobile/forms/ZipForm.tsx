import { Button, FormTextField } from "@/components/ui";
import { FormikProvider, type FormikProps } from "formik";

interface Props {
  formik: FormikProps<{ code: string }>;
  // Label of the secondary button ("Not now" or "Cancel").
  dismissLabel: string;
  onDismiss: () => void;
}

// The ZIP code field and its buttons. The bottom sheet around it owns the title.
export function ZipForm({ formik, dismissLabel, onDismiss }: Props) {
  return (
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
        // Nothing to look up until a ZIP code has been typed.
        disabled={formik.values.code.trim().length === 0}
        onPress={() => formik.handleSubmit()}
      />
      <Button
        testID="zip-dismiss"
        variant="ghost"
        title={dismissLabel}
        onPress={onDismiss}
        disabled={formik.isSubmitting}
      />
    </FormikProvider>
  );
}
