import { apiErrorMessage } from "@/api/errors";
import { apiClient } from "@nearcommerce/api";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token.trim()) return setError("Paste the reset code from your email.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token: token.trim(),
        new_password: password,
      });
      setDone(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setError(
        status === 400
          ? "This reset code is invalid or has expired. Request a new link."
          : apiErrorMessage(
              err,
              "We couldn't reset your password. Please try again.",
            ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>NEARCOMMERCE</Text>
        <Text style={styles.title}>Choose a new password</Text>

        {done ? (
          <View style={styles.success} accessibilityRole="alert">
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successBody}>
              You've been signed out everywhere. Sign in with your new password.
            </Text>
            <Pressable
              testID="go-to-login"
              onPress={() => router.replace("/(auth)/login")}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Go to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {!params.token && (
              <>
                <Text style={styles.label}>Reset code</Text>
                <TextInput
                  testID="token-input"
                  style={styles.input}
                  placeholder="Paste the code from your email"
                  placeholderTextColor="#9aa7b5"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}
            <Text style={styles.label}>New password</Text>
            <TextInput
              testID="new-password-input"
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor="#9aa7b5"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              testID="confirm-password-input"
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#9aa7b5"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}
            <Pressable
              testID="reset-button"
              style={[styles.button, isSubmitting && styles.disabled]}
              onPress={submit}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset password</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.back}
              onPress={() => router.replace("/(auth)/forgot-password")}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Request a new link</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f8fb" },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  title: {
    color: "#123047",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },
  label: {
    color: "#123047",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#123047",
  },
  error: { color: "#b91c1c", marginTop: 10 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  success: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  successTitle: { color: "#065f46", fontWeight: "800", fontSize: 16 },
  successBody: { color: "#065f46" },
  back: { marginTop: 20, alignItems: "center", padding: 6 },
  link: { color: "#2563eb", fontWeight: "700" },
});
