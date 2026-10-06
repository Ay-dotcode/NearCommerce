import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

type DisplayProps = { rating: number; size?: number };

// Read-only stars. Half values round to the nearest whole star.
export function Stars({ rating, size = 16 }: DisplayProps) {
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
          color="#eab308"
        />
      ))}
    </View>
  );
}

type PickerProps = { value: number; onChange: (value: number) => void };

export function StarPicker({ value, onChange }: PickerProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
          accessibilityState={{ selected: n === value }}
        >
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={34}
            color="#eab308"
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
});
