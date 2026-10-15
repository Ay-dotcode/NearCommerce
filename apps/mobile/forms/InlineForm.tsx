import { apiErrorMessage } from "@/api/errors";
import { FormTextField } from "@/components/ui";
import { inlineFormSchema } from "@/forms/inline.form";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { FormikProvider, useFormik } from "formik";
import type { TextInputProps } from "react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface Props {
  initialValue?: string;
  accessibilityLabel: string;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  submitIcon?: keyof typeof Ionicons.glyphMap;
  submitLabel?: string;
  submitAccessibilityLabel: string;
  errorFallback: string;
  resetOnSuccess?: boolean;
  cancel?: { label: string; accessibilityLabel: string; onPress: () => void };
  onSubmit: (value: string) => Promise<unknown> | void;
}

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
    validationSchema: inlineFormSchema,
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
