import { useTheme } from "@/theme";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

// The blurred, dimmed layer behind every sheet and drawer: the content underneath stays visible
// but softened. Tapping it dismisses the overlay.
export function BlurBackdrop({
  onPress,
  testID = "blur-backdrop",
  accessibilityLabel = "Close",
}: Props) {
  const { isDark, colors } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BlurView
        intensity={40}
        tint={isDark ? "dark" : "light"}
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
        testID={`${testID}-blur`}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.scrim, opacity: isDark ? 0.45 : 0.25 },
        ]}
      />
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
