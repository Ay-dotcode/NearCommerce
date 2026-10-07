import { METERS_PER_MILE } from "@/constants";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  name: string;
  price: number | string;
  inStock: boolean;
  isStale: boolean;
  storeName?: string;
  distanceMeters?: number;
  quantity?: number;
  onPress: () => void;
};

export default function ProductCard({
  name,
  price,
  inStock,
  isStale,
  storeName,
  distanceMeters,
  quantity,
  onPress,
}: Props) {
  const where = [
    storeName,
    distanceMeters !== undefined
      ? `${(distanceMeters / METERS_PER_MILE).toFixed(1)} mi`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        {where !== "" && <Text style={styles.where}>{where}</Text>}
        <View style={styles.badges}>
          <Text style={inStock ? styles.inStock : styles.outOfStock}>
            {inStock
              ? quantity !== undefined
                ? `In Stock (${quantity})`
                : "In Stock"
              : "Out of Stock"}
          </Text>
          <Text style={isStale ? styles.stale : styles.fresh}>
            {isStale ? "Not recently verified" : "Recently verified"}
          </Text>
        </View>
      </View>
      <Text style={styles.price}>${Number(price).toFixed(2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  copy: { flex: 1 },
  name: { color: "#123047", fontSize: 15, fontWeight: "800" },
  where: { color: "#718096", fontSize: 12, marginTop: 4 },
  badges: { flexDirection: "row", gap: 10, marginTop: 6 },
  inStock: { color: "#10b981", fontSize: 12, fontWeight: "bold" },
  outOfStock: { color: "#ef4444", fontSize: 12, fontWeight: "bold" },
  fresh: { color: "#166534", fontSize: 12 },
  stale: { color: "#b45309", fontSize: 12 },
  price: { color: "#123047", fontWeight: "800" },
});
