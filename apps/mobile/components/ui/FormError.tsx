import { useThemedStyles, type ThemeColors } from "@/theme";
import { StyleSheet, Text, View } from "react-native";

// Form-level error banner (for example "wrong password"). Replaces error pop-ups: the message
// sits inside the form, announced to screen readers, with the fields shown in error mode.
export function FormError({ message }: { message?: string | null }) {
  const styles = useThemedStyles(makeStyles);
  if (!message) return null;
  return (
    <View
      testID="form-error"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.box}
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    box: {
      backgroundColor: c.dangerSoft,
      borderColor: c.dangerBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    text: { color: c.dangerText, fontSize: 14, fontWeight: "600" },
  });
