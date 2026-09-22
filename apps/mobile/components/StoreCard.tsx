import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StoreProps } from "@/types";

export default function StoreCard({
  id,
  name,
  isOpen,
  rating,
  distance,
}: StoreProps) {
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
            <Ionicons name="star" size={16} color="#eab308" />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#123047",
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
  title: { flex: 1, color: "#123047", fontSize: 18, fontWeight: "700" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  openBadge: { backgroundColor: "#dcfce7" },
  closedBadge: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 12, fontWeight: "800" },
  openText: { color: "#166534" },
  closedText: { color: "#991b1b" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: "#4b5563", fontSize: 14, fontWeight: "600" },
  distance: { color: "#718096", fontSize: 14 },
});
