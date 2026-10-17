import { BackButton } from "@/components/ui/BackButton";
import { BrandIcon } from "@/components/ui";
import { useThemedStyles, type ThemeColors } from "@/theme";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  title: string;
  subtitle?: string;
  // Shows a back arrow above the brand (every page except the sign-in page itself).
  showBack?: boolean;
  children: ReactNode;
}

// Shared frame for sign in, register, forgot and reset password: safe area, brand mark,
// heading, and a form area that scrolls above the keyboard.
export default function AuthScreen({
  title,
  subtitle,
  showBack = false,
  children,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBack && <BackButton fallback="/(auth)/login" />}
          <View style={styles.brand}>
            <BrandIcon size={44} />
            <Text style={styles.eyebrow}>NEARCOMMERCE</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    container: { flexGrow: 1, justifyContent: "center", padding: 28 },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    },
    eyebrow: {
      color: c.primary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.6,
    },
    title: { color: c.text, fontSize: 30, fontWeight: "800", marginBottom: 6 },
    subtitle: { color: c.textMuted, fontSize: 15, marginBottom: 28 },
  });
