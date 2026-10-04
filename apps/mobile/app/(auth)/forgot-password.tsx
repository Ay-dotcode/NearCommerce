import { apiErrorMessage } from "@/api/errors";
import { apiClient } from "@nearcommerce/api";
import { router } from "expo-router";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/forgot-password", { email: value });
      setSent(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setError(
        status === 429
          ? "Too many requests. Please wait a few minutes and try again."
          : apiErrorMessage(
              err,
              "We couldn't send the reset link. Please try again.",
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
        <Text style={styles.title}>Reset your password</Text>

        {sent ? (
          <View style={styles.success} accessibilityRole="alert">
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successBody}>
              If that email is registered, a reset link is on its way. It works
              for one hour.
            </Text>
            <Pressable
              testID="have-token-link"
              onPress={() => router.replace("/(auth)/reset-password")}
              accessibilityRole="link"
            >
              <Text style={styles.link}>I have a reset code</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Enter the email you signed up with and we'll send you a reset
              link.
            </Text>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="email-input"
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9aa7b5"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}
            <Pressable
              testID="send-reset-button"
              style={[styles.button, isSubmitting && styles.disabled]}
              onPress={submit}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send reset link</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable
          style={styles.back}
          onPress={() => router.replace("/(auth)/login")}
          accessibilityRole="link"
        >
          <Text style={styles.link}>Back to sign in</Text>
        </Pressable>
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
  title: { color: "#123047", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#718096", fontSize: 15, marginBottom: 24 },
  label: { color: "#123047", fontSize: 14, fontWeight: "700", marginBottom: 6 },
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
    marginTop: 18,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  success: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  successTitle: { color: "#065f46", fontWeight: "800", fontSize: 16 },
  successBody: { color: "#065f46" },
  back: { marginTop: 24, alignItems: "center", padding: 6 },
  link: { color: "#2563eb", fontWeight: "700" },
});
