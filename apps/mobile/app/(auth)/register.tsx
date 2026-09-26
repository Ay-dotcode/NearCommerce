import { apiClient } from "@nearcommerce/api";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";

interface RegisterResponse {
  access_token: string;
  user: { id: string; role: string };
}

export default function RegisterScreen() {
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Register — backend auto-verifies email in MVP
      await apiClient.post("/auth/register", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // Immediately log in to get a token
      const res = await apiClient.post<RegisterResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      await login(res.data.access_token);
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ?? "Registration failed. Please try again.";
      Alert.alert("Registration Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Brand */}
        <Text style={styles.eyebrow}>NEARCOMMERCE</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Discover local stores and plan shopping trips.
        </Text>

        {/* Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            testID="fullname-input"
            style={styles.input}
            placeholder="e.g. Jane Doe"
            placeholderTextColor="#9aa7b5"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
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
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="password-input"
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor="#9aa7b5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
        </View>

        {/* Submit */}
        <Pressable
          testID="register-button"
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        {/* Login link */}
        <Pressable
          style={styles.loginLink}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text style={styles.loginAction}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f8fb" },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  title: {
    color: "#123047",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#718096",
    fontSize: 15,
    marginBottom: 32,
  },
  fieldGroup: { marginBottom: 18 },
  label: {
    color: "#123047",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
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
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  loginLink: { marginTop: 20, alignItems: "center" },
  loginText: { color: "#718096", fontSize: 14 },
  loginAction: { color: "#2563eb", fontWeight: "700" },
});
