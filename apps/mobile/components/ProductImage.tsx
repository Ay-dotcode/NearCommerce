import { resolveImageUrl } from "@/helpers/imageUrl";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  // The product's saved image_url (as returned by the API).
  uri?: string | null;
  // Spoken description for screen readers, usually the product name.
  label: string;
  size?: number;
  // Fill the available width at this width / height ratio instead of a fixed square.
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
};

// A product picture. When there is no picture, or it fails to load (offline, deleted), a plain
// placeholder is drawn in the same space so lists and screens don't jump around.
export default function ProductImage({
  uri,
  label,
  size = 64,
  aspectRatio,
  style,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const source = resolveImageUrl(uri);
  const [failed, setFailed] = useState(false);

  // A different product (or a new picture) gets a fresh chance to load.
  useEffect(() => setFailed(false), [source]);

  const box: { width: DimensionValue; height?: number; aspectRatio?: number } =
    aspectRatio
      ? { width: "100%", aspectRatio }
      : { width: size, height: size };

  return (
    <View style={[styles.box, box, style]}>
      {source && !failed ? (
        <Image
          testID="product-image"
          source={{ uri: source }}
          accessibilityLabel={label}
          resizeMode="cover"
          style={styles.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <View testID="product-image-placeholder" style={styles.placeholder}>
          <Ionicons
            name="image-outline"
            size={aspectRatio ? 40 : Math.round(size * 0.4)}
            style={styles.icon}
          />
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    box: {
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    image: { width: "100%", height: "100%" },
    placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
    icon: { color: c.textMuted },
  });
