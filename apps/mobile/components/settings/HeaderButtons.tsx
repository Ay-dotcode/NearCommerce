import { useSettings } from "@/src/context/SettingsContext";
import { useColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

// App-bar button that opens the settings drawer from any screen.
export function SettingsHeaderButton() {
  const { openSettings } = useSettings();
  const c = useColors();
  return (
    <Pressable
      onPress={openSettings}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={10}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="settings-outline" size={22} color={c.text} />
    </Pressable>
  );
}
