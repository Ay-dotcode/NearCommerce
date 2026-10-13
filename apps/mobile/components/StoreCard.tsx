import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StoreProps } from "@/types/store";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";

export default function StoreCard({
  id,
  name,
  isOpen,
  rating,
  distance,
}: StoreProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  return (
    <Link href={`/store/${id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{name}</Text>
          <View
            style={[
              styles.badge,
              isOpen ? styles.openBadge : styles.closedBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isOpen ? styles.openText : styles.closedText,
              ]}
            >
              {isOpen ? "Open Now" : "Closed"}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.rating}>
            <Ionicons name="star" size={16} color={c.star} />
            <Text style={styles.ratingText}>
              {rating > 0 ? rating.toFixed(1) : "New"}
            </Text>
          </View>
          {distance !== undefined && (
            <Text style={styles.distance}>
              {distance.toFixed(1)} miles away
            </Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 12,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    title: { flex: 1, color: c.text, fontSize: 18, fontWeight: "700" },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    openBadge: { backgroundColor: c.successSoft },
    closedBadge: { backgroundColor: c.dangerSoft },
    badgeText: { fontSize: 12, fontWeight: "800" },
    openText: { color: c.successText },
    closedText: { color: c.dangerText },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 14,
    },
    rating: { flexDirection: "row", alignItems: "center", gap: 4 },
    ratingText: { color: c.textSecondary, fontSize: 14, fontWeight: "600" },
    distance: { color: c.textMuted, fontSize: 14 },
  });
