import { apiErrorMessage } from "@/api/errors";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { FormikProvider, useFormik } from "formik";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Yup from "yup";
import { FormTextField } from "./FormTextField";
import type { TextInputProps } from "react-native";

interface Props {
  initialValue?: string;
  // Spoken name of the input (there is no visible label).
  accessibilityLabel: string;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  // Submit button: an icon or a text label, always with an accessible name.
  submitIcon?: keyof typeof Ionicons.glyphMap;
  submitLabel?: string;
  submitAccessibilityLabel: string;
  // Shown when onSubmit throws an error with no message of its own.
  errorFallback: string;
  // Clear the field after a successful submit (add-style forms).
  resetOnSuccess?: boolean;
  // Optional secondary text button (for example Cancel).
  cancel?: { label: string; accessibilityLabel: string; onPress: () => void };
  onSubmit: (value: string) => Promise<unknown> | void;
}

// One text field plus a button, as a Formik form. Problems (empty input, or an error thrown by
// onSubmit) show inline under the field in error mode, never in a pop-up. Used to create a
// list, add an item to a list and rename a list.
export function InlineForm({
  initialValue = "",
  accessibilityLabel,
  placeholder,
  maxLength,
  autoFocus,
  autoCapitalize,
  submitIcon,
  submitLabel,
  submitAccessibilityLabel,
  errorFallback,
  resetOnSuccess = true,
  cancel,
  onSubmit,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const formik = useFormik({
    initialValues: { value: initialValue },
    validationSchema: Yup.object({
      value: Yup.string().trim().required("Enter a name."),
    }),
    validateOnChange: false,
    onSubmit: async ({ value }, helpers) => {
      try {
        await onSubmit(value.trim());
        if (resetOnSuccess) helpers.resetForm();
      } catch (err) {
        helpers.setFieldError("value", apiErrorMessage(err, errorFallback));
      }
    },
  });

  const empty = formik.values.value.trim() === "";
  const blocked = empty || formik.isSubmitting;

  return (
    <FormikProvider value={formik}>
      <View style={styles.row}>
        <FormTextField
          name="value"
          accessibilityLabel={accessibilityLabel}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          returnKeyType="done"
          onSubmitEditing={() => !blocked && formik.handleSubmit()}
          containerStyle={styles.field}
        />
        <Pressable
          onPress={() => formik.handleSubmit()}
          disabled={blocked}
          accessibilityRole="button"
          accessibilityLabel={submitAccessibilityLabel}
          accessibilityState={{ disabled: blocked, busy: formik.isSubmitting }}
          style={[styles.submit, blocked && styles.disabled]}
        >
          {formik.isSubmitting ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : submitIcon ? (
            <Ionicons name={submitIcon} size={22} color={c.onPrimary} />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </Pressable>
        {cancel && (
          <Pressable
            onPress={cancel.onPress}
            accessibilityRole="button"
            accessibilityLabel={cancel.accessibilityLabel}
          >
            <Text style={styles.cancel}>{cancel.label}</Text>
          </Pressable>
        )}
      </View>
    </FormikProvider>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 12,
    },
    field: { flex: 1, marginBottom: 0 },
    submit: {
      minHeight: 50,
      minWidth: 50,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    submitText: { color: c.onPrimary, fontWeight: "800" },
    disabled: { opacity: 0.5 },
    cancel: { color: c.textMuted, fontWeight: "600", paddingVertical: 14 },
  });
