import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@nearcommerce/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProductDetail {
  id: string;
  name: string;
  price: number;
  description?: string;
  last_verified_at: string;
  store_id: string;
  store?: {
    name: string;
  };
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await apiClient.get<ProductDetail>(`/products/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => apiClient.post("/favorites", { product_id: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  if (isLoading)
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
          style={{ marginTop: 50 }}
        />
      </SafeAreaView>
    );

  if (!product)
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Text style={styles.error}>Product not found.</Text>
      </SafeAreaView>
    );

  const isFresh =
    new Date(product.last_verified_at) >
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{product.name}</Text>
        <Pressable
          onPress={() => toggleFavorite.mutate()}
          disabled={toggleFavorite.isPending}
          hitSlop={8}
        >
          <Ionicons name="heart-outline" size={28} color="#ef4444" />
        </Pressable>
      </View>

      <Text
        style={styles.storeLink}
        onPress={() => router.push(`/store/${product.store_id}`)}
      >
        View Store: {product.store?.name ?? "Store details"}
      </Text>

      <View style={styles.metaContainer}>
        <Text style={styles.price}>${Number(product.price).toFixed(2)}</Text>
        <View
          style={[
            styles.badge,
            isFresh ? styles.badgeFresh : styles.badgeStale,
          ]}
        >
          <Text style={styles.badgeText}>
            {isFresh ? "Verified Fresh" : "Stale (>30 days)"}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        {product.description || "No description provided."}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/lists")}
        >
          <Text style={styles.actionButtonText}>Add to Household List</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "bold", flex: 1, color: "#123047" },
  storeLink: {
    fontSize: 16,
    color: "#2563eb",
    marginVertical: 10,
    textDecorationLine: "underline",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  price: { fontSize: 22, fontWeight: "bold", color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeFresh: { backgroundColor: "#d1fae5" },
  badgeStale: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  description: {
    fontSize: 16,
    color: "#4b5563",
    lineHeight: 24,
    marginBottom: 30,
  },
  actions: { marginTop: "auto", marginBottom: 20 },
  actionButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  error: { textAlign: "center", marginTop: 50, fontSize: 16, color: "#6b7280" },
});
