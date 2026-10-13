import { Image, type StyleProp, type ImageStyle } from "react-native";

// The NearCommerce app icon (rendered from packages/ui/public/icon.svg into assets/logo.png).
export function BrandIcon({
  size = 40,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={require("@/assets/logo.png")}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
    />
  );
}
