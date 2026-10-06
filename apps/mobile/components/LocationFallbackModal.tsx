import {
  PostalCodeError,
  resolvePostalCode,
  setManualLocation,
} from "@/utils/location";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  // Called after a location was saved, or when the shopper chooses Not now.
  onClose: () => void;
  // Why the modal is open, shown above the input.
  reason?: "denied" | "manual";
};

const MESSAGES: Record<string, string> = {
  invalid: "Enter a valid ZIP or postal code.",
  not_found: "We couldn't find that ZIP code. Check it and try again.",
  unavailable: "Couldn't look up that code. Check your connection.",
};

export default function LocationFallbackModal({
  visible,
  onClose,
  reason = "denied",
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await setManualLocation(await resolvePostalCode(code));
      setCode("");
      onClose();
    } catch (err) {
      setError(
        err instanceof PostalCodeError
          ? MESSAGES[err.reason]
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>
            {reason === "denied"
              ? "Location is turned off"
              : "Set your location"}
          </Text>
          <Text style={styles.body}>
            {reason === "denied"
              ? "Enter your ZIP code and we'll show stores near it. You can allow location access any time in your phone's settings."
              : "Enter a ZIP code to see stores and prices near it."}
          </Text>
          <TextInput
            testID="zip-input"
            style={styles.input}
            placeholder="ZIP code"
            placeholderTextColor="#9aa7b5"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="ZIP code"
          />
          {error && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}
          <Pressable
            testID="zip-submit"
            style={[styles.button, busy && styles.disabled]}
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Use this location</Text>
            )}
          </Pressable>
          <Pressable
            testID="zip-dismiss"
            style={styles.dismiss}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.dismissText}>
              {reason === "denied" ? "Not now" : "Cancel"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 48, 71, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 12 },
  title: { color: "#123047", fontSize: 20, fontWeight: "800" },
  body: { color: "#4b5563", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 2,
    color: "#123047",
  },
  error: { color: "#b91c1c" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  dismiss: { alignItems: "center", padding: 6 },
  dismissText: { color: "#2563eb", fontWeight: "700" },
});
