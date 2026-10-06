import LocationFallbackModal from "@/components/LocationFallbackModal";
import { useAuth } from "@/src/context/AuthContext";
import { useManualLocation } from "@/src/hooks/useManualLocation";
import { clearManualLocation } from "@/utils/location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Button,
  Linking,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [zipOpen, setZipOpen] = useState(false);
  const manualLocation = useManualLocation();

  useEffect(() => {
    const loadPreferences = async () => {
      const stored = await AsyncStorage.getItem("@routing_avoid_tolls");
      if (stored !== null) setAvoidTolls(stored === "true");
    };
    loadPreferences();
  }, []);

  const toggleSwitch = async (value: boolean) => {
    setAvoidTolls(value);
    await AsyncStorage.setItem("@routing_avoid_tolls", String(value));
  };

  const testMapHandoff = () => {
    // Deep linking to native maps (geo: for Android, maps:// for iOS)
    const url =
      Platform.OS === "ios"
        ? "maps://?q=40.7128,-74.0060"
        : "geo:40.7128,-74.0060?q=40.7128,-74.0060(Store)";
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
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
        <Button title="Test Native Map Handoff" onPress={testMapHandoff} />
      </View>

      <View style={styles.actionContainer}>
        <Button
          title="Sign out"
          color="#b91c1c"
          onPress={() => void logout()}
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
