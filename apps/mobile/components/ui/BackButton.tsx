import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

interface Props {
  // Where to go when there is no previous screen (the app was opened straight onto this one).
  fallback: Href;
  label?: string;
  // Inside a navigation header (no extra space below).
  inHeader?: boolean;
}

// "‹ Back" for screens that have no native app bar. Goes to the previous screen, or to
// `fallback` when there is none.
export function BackButton({ fallback, label = "Back", inHeader = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable
      testID="back-button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      style={[styles.button, inHeader && styles.inHeader]}
    >
      <Ionicons name="chevron-back" size={22} color={c.primary} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginLeft: -6,
      marginBottom: 12,
    },
    inHeader: { marginBottom: 0, marginLeft: 8 },
    label: { color: c.primary, fontSize: 16, fontWeight: "700" },
  });
