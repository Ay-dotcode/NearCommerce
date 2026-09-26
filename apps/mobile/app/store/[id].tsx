import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@nearcommerce/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}

interface Store {
  id: string;
  name: string;
  address: string;
  products: Product[];
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const res = await apiClient.get<Store>(`/stores/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      return apiClient.post("/favorites", { store_id: id });
    },
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
        <Pressable
          onPress={() => toggleFavorite.mutate()}
          disabled={toggleFavorite.isPending}
          hitSlop={8}
        >
          <Ionicons name="heart-outline" size={28} color="#ef4444" />
        </Pressable>
      </View>
      <Text style={styles.address}>{store.address}</Text>

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
            {item.quantity > 0 ? (
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
  address: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
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
