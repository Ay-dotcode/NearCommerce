import { useThemedStyles, type ThemeColors } from "@/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  testID?: string;
}

// A row of mutually exclusive choices (for example Auto / Light / Dark).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  testID = "segmented-control",
}: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.row}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={`${testID}-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: 8,
    },
    selected: { backgroundColor: c.primary },
    text: { color: c.textSecondary, fontSize: 14, fontWeight: "700" },
    selectedText: { color: c.onPrimary },
  });
