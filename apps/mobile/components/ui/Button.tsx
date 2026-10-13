import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// The one button used across the app. `loading` swaps the label for a spinner (inside the
// button only) and blocks repeat taps.
export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  testID,
  accessibilityLabel,
  style,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const inactive = disabled || loading;
  const spinner = variant === "primary" ? c.onPrimary : c.primary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinner} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text` as const]]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    base: {
      borderRadius: 12,
      paddingVertical: 15,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
    },
    primary: { backgroundColor: c.primary },
    secondary: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    danger: { backgroundColor: c.dangerSoft },
    ghost: { backgroundColor: "transparent" },
    inactive: { opacity: 0.55 },
    pressed: { opacity: 0.85 },
    text: { fontSize: 16, fontWeight: "800" },
    primaryText: { color: c.onPrimary },
    secondaryText: { color: c.text },
    dangerText: { color: c.dangerText },
    ghostText: { color: c.primaryText },
  });
