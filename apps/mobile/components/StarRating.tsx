import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";

type DisplayProps = { rating: number; size?: number };

// Read-only stars. Half values round to the nearest whole star.
export function Stars({ rating, size = 16 }: DisplayProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const filled = Math.round(rating);
  return (
    <View
      style={styles.row}
      accessibilityLabel={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= filled ? "star" : "star-outline"}
          size={size}
          color={c.star}
        />
      ))}
    </View>
  );
}

type PickerProps = {
  value: number;
  onChange: (value: number) => void;
  // Locks the stars (for example while the review is being sent).
  disabled?: boolean;
};

export function StarPicker({ value, onChange, disabled }: PickerProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          disabled={disabled}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
          accessibilityState={{
            selected: n === value,
            disabled: Boolean(disabled),
          }}
        >
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={34}
            color={c.star}
          />
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 4 },
  });
