import AuthLink from "@/components/auth/AuthLink";
import { Button } from "@/components/ui";
import { useOptionalSettings } from "@/src/context/SettingsContext";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

export function ForgotPasswordForm({
  onSentChange,
}: {
  // Lets the screen change its subtitle once the email has been sent.
  onSentChange?: (sent: boolean) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const settings = useOptionalSettings();

  const handleContactSupport = () => {
    if (settings?.openSupport) {
      settings.openSupport();
    } else {
      Alert.alert(
        "Contact Support",
        "Please contact support via the web portal or your administrator.",
      );
    }
  };

  return (
    <>
      <View style={styles.disabledBox} accessibilityRole="alert">
        <Text style={styles.disabledTitle}>Password Reset Disabled</Text>
        <Text style={styles.disabledBody}>
          Password reset via email is disabled on this mock app. Please contact
          support to recover access to your account.
        </Text>
        <Button
          testID="contact-support-button"
          title="Contact support"
          variant="secondary"
          onPress={handleContactSupport}
        />
      </View>

      <AuthLink
        label="Back to sign in"
        onPress={() => router.replace("/(auth)/login")}
      />
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    disabledBox: {
      backgroundColor: c.primarySoft,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    disabledTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 6,
    },
    disabledBody: {
      color: c.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 14,
    },
    success: {
      backgroundColor: c.successSoft,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    successTitle: {
      color: c.successText,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 4,
    },
    successBody: { color: c.successText, marginBottom: 8 },
  });

