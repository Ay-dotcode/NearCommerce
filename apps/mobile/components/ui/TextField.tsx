import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { forwardRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

export interface TextFieldProps extends TextInputProps {
  label?: string;
  // Shown under the input in the error colour; also turns the border red ("error mode").
  error?: string;
  hint?: string;
  // Red "error mode" without a message of its own (a form-level message explains it).
  invalid?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

// Labelled input with an inline error mode. Validation problems appear right under the field
// (red border + message) instead of in a pop-up, and are announced to screen readers.
export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    { label, error, hint, invalid, containerStyle, style, testID, ...rest },
    ref,
  ) => {
    const styles = useThemedStyles(makeStyles);
    const c = useColors();
    return (
      <View style={[styles.group, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={Boolean(error) || Boolean(invalid)}
          placeholderTextColor={c.placeholder}
          style={[
            styles.input,
            error || invalid ? styles.inputError : null,
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            testID={testID ? `${testID}-error` : undefined}
            style={styles.error}
          >
            {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);
TextField.displayName = "TextField";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    group: { marginBottom: 18 },
    label: {
      color: c.text,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 16,
      color: c.text,
    },
    inputError: { borderColor: c.danger, backgroundColor: c.dangerSoft },
    error: { color: c.danger, fontSize: 13, fontWeight: "600", marginTop: 6 },
    hint: { color: c.textMuted, fontSize: 13, marginTop: 6 },
  });
