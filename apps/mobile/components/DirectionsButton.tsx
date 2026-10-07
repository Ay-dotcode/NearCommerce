import { openNativeMaps } from "@/utils/maps";
import { Pressable, StyleSheet, Text } from "react-native";
import Toast from "react-native-toast-message";

type Props = { latitude: number; longitude: number; label: string };

export default function DirectionsButton({
  latitude,
  longitude,
  label,
}: Props) {
  const onPress = async () => {
    const opened = await openNativeMaps(latitude, longitude, label).catch(
      () => false,
    );
    if (!opened)
      Toast.show({
        type: "error",
        text1: "Couldn't open maps",
        text2: "No maps app is available on this device.",
      });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Get directions to ${label}`}
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.text}>Get directions</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderColor: "#2563eb",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  text: { color: "#2563eb", fontWeight: "700", fontSize: 15 },
});
