import { resolveImageUrl } from "@/helpers/imageUrl";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
// A failed load is retried this many times, after these delays, before the placeholder is kept.
// A server that is just waking up (or a weak signal) often fails the first request.
export const IMAGE_RETRY_DELAYS_MS = [1500, 3000];

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
  const [attempt, setAttempt] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A different product (or a new picture) gets a fresh chance to load.
  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [source]);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const onError = () => {
    const delay = IMAGE_RETRY_DELAYS_MS[attempt];
    if (delay === undefined) return setFailed(true);
    retryTimer.current = setTimeout(() => setAttempt((n) => n + 1), delay);
  };

  const box: { width: DimensionValue; height?: number; aspectRatio?: number } =
    aspectRatio
      ? { width: "100%", aspectRatio }
      : { width: size, height: size };

  return (
    <View style={[styles.box, box, style]}>
      {source && !failed ? (
        <Image
          key={`${source}#${attempt}`}
          testID="product-image"
          source={{ uri: source }}
          accessibilityLabel={label}
          resizeMode="cover"
          style={styles.image}
          onError={onError}
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
