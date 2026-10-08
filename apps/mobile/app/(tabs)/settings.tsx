import { apiErrorMessage } from "@/api/errors";
import LocationFallbackModal from "@/components/LocationFallbackModal";
import VerifyEmailPrompt from "@/components/VerifyEmailPrompt";
import { AVOID_TOLLS_KEY } from "@/constants";
import { useAuth } from "@/src/context/AuthContext";
import { useManualLocation } from "@/src/hooks/useManualLocation";
import { clearManualLocation } from "@/utils/location";
import { apiClient } from "@nearcommerce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Switch, Text, View } from "react-native";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [zipOpen, setZipOpen] = useState(false);
  const manualLocation = useManualLocation();

  useEffect(() => {
    const loadPreferences = async () => {
      const stored = await AsyncStorage.getItem(AVOID_TOLLS_KEY);
      if (stored !== null) setAvoidTolls(stored === "true");
    };
    loadPreferences();
  }, []);

  const toggleSwitch = async (value: boolean) => {
    setAvoidTolls(value);
    await AsyncStorage.setItem(AVOID_TOLLS_KEY, String(value));
  };

  const deleteAccount = async () => {
    try {
      await apiClient.delete("/users/me");
      await logout();
    } catch (error) {
      Alert.alert(
        "Couldn't delete account",
        apiErrorMessage(error, "Please try again."),
      );
    }
  };

  const confirmDeleteAccount = () =>
    Alert.alert(
      "Delete your account?",
      "This permanently removes your account, favorites and reviews. Household lists you own pass to the next member, or are deleted if you are the only member. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => void deleteAccount(),
        },
      ],
    );

  return (
    <View style={styles.container}>
      <VerifyEmailPrompt />
      <Text style={styles.title}>Routing Preferences</Text>
      <View style={styles.settingRow}>
        <Text style={styles.label}>Avoid Tolls on Route</Text>
        <Switch
          testID="tolls-switch"
          value={avoidTolls}
          onValueChange={toggleSwitch}
        />
      </View>

      <Text style={[styles.title, styles.section]}>Location</Text>
      <Text style={styles.label}>
        {manualLocation
          ? `Using ZIP code ${manualLocation.postalCode}`
          : "Using your device location"}
      </Text>
      <View style={styles.actionContainer}>
        <Button
          title="Set location by ZIP code"
          onPress={() => setZipOpen(true)}
        />
      </View>
      {manualLocation && (
        <View style={styles.smallGap}>
          <Button
            title="Use my device location"
            onPress={() => void clearManualLocation()}
          />
        </View>
      )}
      <LocationFallbackModal
        visible={zipOpen}
        reason="manual"
        onClose={() => setZipOpen(false)}
      />

      <View style={styles.actionContainer}>
        <Button
          title="Sign out"
          color="#b91c1c"
          onPress={() => void logout()}
        />
      </View>

      <View style={styles.smallGap}>
        <Button
          title="Delete account"
          color="#b91c1c"
          onPress={confirmDeleteAccount}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  label: { fontSize: 16 },
  actionContainer: { marginTop: 40 },
  section: { marginTop: 32, fontSize: 20 },
  smallGap: { marginTop: 12 },
});
