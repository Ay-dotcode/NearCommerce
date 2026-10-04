import FavoriteButton from "@/components/FavoriteButton";
import { apiClient } from "@nearcommerce/api";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  in_stock: boolean;
  isStale?: boolean;
}

interface Store {
  id: string;
  name: string;
  address: string;
  isOpen?: boolean;
  rating?: number;
  review_count?: number;
  products: Product[];
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Store }>(`/stores/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
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

  if (!store)
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Text style={styles.error}>Store not found or suspended.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{store.name}</Text>
        <FavoriteButton storeId={store.id} />
      </View>
      <Text style={styles.address}>{store.address}</Text>
      <View style={styles.metaRow}>
        <View
          style={[styles.badge, store.isOpen ? styles.open : styles.closed]}
        >
          <Text style={styles.badgeText}>
            {store.isOpen ? "Open Now" : "Closed"}
          </Text>
        </View>
        <Text style={styles.rating}>
          {store.rating && store.rating > 0
            ? `★ ${store.rating.toFixed(1)} (${store.review_count ?? 0})`
            : "No reviews yet"}
        </Text>
      </View>

      <Text style={styles.subtitle}>Inventory</Text>
      <FlatList
        data={store.products ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.id}`)}
          >
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
            {item.in_stock ? (
              <Text style={styles.inStock}>In Stock ({item.quantity})</Text>
            ) : (
              <Text style={styles.outOfStock}>Out of Stock</Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No products available.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#123047" },
  address: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  open: { backgroundColor: "#dcfce7" },
  closed: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#123047" },
  rating: { color: "#4b5563", fontSize: 14 },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#123047",
    marginBottom: 10,
  },
  productCard: {
    padding: 15,
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
  },
  productName: { fontSize: 16, fontWeight: "500", color: "#123047" },
  price: { fontSize: 14, color: "#374151", marginVertical: 4 },
  inStock: { color: "#10b981", fontSize: 12, fontWeight: "bold" },
  outOfStock: { color: "#ef4444", fontSize: 12, fontWeight: "bold" },
  error: { textAlign: "center", marginTop: 50, fontSize: 16, color: "#6b7280" },
  emptyText: { color: "#718096", textAlign: "center", marginTop: 20 },
});
