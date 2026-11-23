import { Button } from "@/components/ui";
import {
  describeNativeFailure,
  googleWebClientId,
  requestGoogleIdToken,
  signOutOfGoogle,
  type GoogleFailure,
} from "@/helpers/googleSignIn";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme, useThemedStyles, type ThemeColors } from "@/theme";
import {
  apiClient,
  googleSignInErrorMessage,
  isSuspendedError,
  type GoogleAuthResponse,
} from "@nearcommerce/api";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

// "or  [Sign in with Google]" under the login and register forms. Shoppers sign in with Google
// and get a new shopper account when they have none. Renders nothing when no Google client id
// is configured, so builds without Google set up show no half-working button.
export function GoogleSignInButton({
  onFailure,
}: {
  onFailure: (failure: GoogleFailure) => void;
}) {
  const { login } = useAuth();
  const styles = useThemedStyles(makeStyles);
  // Google's dark and light variants, chosen by the app's own theme (which already honours the
  // Light / Dark / Auto setting), not just the device's.
  const { isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  if (!googleWebClientId()) return null;

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Step 1: Google's own sheet. Closing it is not an error.
      let idToken: string | null;
      try {
        idToken = await requestGoogleIdToken();
      } catch (error) {
        const failure = describeNativeFailure(error);
        if (failure) onFailure(failure);
        return;
      }
      if (!idToken) return;

      // Step 2: our API. A refusal (account exists, suspended, ...) is shown as the server
      // words it, and the Google account is forgotten so the next try shows the picker.
      try {
        const res = await apiClient.post<GoogleAuthResponse>("/auth/google", {
          id_token: idToken,
          role: "CUSTOMER",
        });
        await login(res.data.access_token, res.data.refresh_token);
        router.replace("/(tabs)");
      } catch (error) {
        await signOutOfGoogle();
        onFailure({
          message: googleSignInErrorMessage(error),
          suspended: isSuspendedError(error),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap} testID="google-sign-in">
      <View style={styles.divider}>
        <View style={styles.rule} />
        <Text style={styles.or}>or</Text>
        <View style={styles.rule} />
      </View>
      {busy ? (
        <Button title="Signing in with Google" onPress={start} loading />
      ) : (
        <View style={styles.buttonRow}>
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={isDark ? "dark" : "light"}
            onPress={start}
            accessibilityLabel="Sign in with Google"
          />
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: 12, marginTop: 4 },
    divider: { flexDirection: "row", alignItems: "center", gap: 12 },
    rule: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    or: { color: c.textMuted, fontSize: 12, textTransform: "uppercase" },
    buttonRow: { alignItems: "center" },
  });
