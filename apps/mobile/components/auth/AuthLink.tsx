import { useThemedStyles, type ThemeColors } from "@/theme";
import { Pressable, StyleSheet, Text } from "react-native";

// Text link used under the auth forms ("Forgot password?", "Create one", ...).
export default function AuthLink({
  label,
  prefix,
  onPress,
  testID,
  align = "center",
}: {
  label: string;
  // Plain text before the link, e.g. "Don't have an account? ".
  prefix?: string;
  onPress: () => void;
  testID?: string;
  align?: "center" | "flex-start" | "flex-end";
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      onPress={onPress}
      style={[
        styles.wrap,
        { alignSelf: align === "center" ? "center" : align },
      ]}
    >
      <Text style={styles.prefix}>
        {prefix}
        <Text style={styles.link}>{label}</Text>
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { padding: 8 },
    prefix: { color: c.textMuted, fontSize: 14 },
    link: { color: c.primary, fontWeight: "700" },
  });
