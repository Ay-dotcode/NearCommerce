import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useField, useFormikContext } from "formik";
import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";
import { TextField, type TextFieldProps } from "./TextField";

export type PasswordFieldProps = Omit<
  TextFieldProps,
  "secureTextEntry" | "rightAccessory"
>;

// A password input with a show/hide eye inside it, so people can check what they typed.
export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(
  ({ testID, editable, ...rest }, ref) => {
    const styles = useThemedStyles(makeStyles);
    const c = useColors();
    const [visible, setVisible] = useState(false);
    const locked = editable === false;
    return (
      <TextField
        {...rest}
        ref={ref}
        testID={testID}
        editable={editable}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        rightAccessory={
          <Pressable
            testID={testID ? `${testID}-toggle` : undefined}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            accessibilityState={{ checked: visible, disabled: locked }}
            disabled={locked}
            hitSlop={8}
            onPress={() => setVisible((v) => !v)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={c.textMuted}
            />
          </Pressable>
        }
      />
    );
  },
);
PasswordField.displayName = "PasswordField";

type FormProps = Omit<
  PasswordFieldProps,
  "value" | "onChangeText" | "onBlur" | "error"
> & { name: string; error?: string };

// Formik-bound PasswordField. Like FormTextField it is locked while the form is submitting.
export function FormPasswordField({
  name,
  error,
  editable,
  ...rest
}: FormProps) {
  const [field, meta, helpers] = useField<string>(name);
  const { isSubmitting } = useFormikContext();
  return (
    <PasswordField
      {...rest}
      editable={!isSubmitting && editable !== false}
      value={field.value}
      onChangeText={(text) => helpers.setValue(text)}
      onBlur={() => helpers.setTouched(true)}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    button: {
      width: 48,
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.5 },
  });
