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
  const [avoidTolls, setAvoidTolls] = useState(false);

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

      <View style={styles.actionContainer}>
        <Button title="Test Native Map Handoff" onPress={testMapHandoff} />
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
});
