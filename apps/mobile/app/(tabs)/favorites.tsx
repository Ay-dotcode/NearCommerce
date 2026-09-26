import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@nearcommerce/api";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FavoriteItem {
  id: string;
  store_id?: string;
  product_id?: string;
  store?: {
    name: string;
  };
  product?: {
    name: string;
  };
}

export default function FavoritesScreen() {
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await apiClient.get<FavoriteItem[]>("/favorites");
      return res.data;
    },
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.title}>Your Favorites</Text>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isStore = Boolean(item.store_id);
          const route = isStore
            ? `/store/${item.store_id}`
            : `/product/${item.product_id}`;
          const name = isStore
            ? (item.store?.name ?? "Store")
            : (item.product?.name ?? "Product");

          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(route as any)}
            >
              <View style={styles.cardHeader}>
                <Ionicons
                  name={isStore ? "storefront" : "pricetag"}
                  size={20}
                  color="#6b7280"
                />
                <Text style={styles.typeLabel}>
                  {isStore ? "Store" : "Product"}
                </Text>
              </View>
              <Text style={styles.itemName}>{name}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>You haven't saved any favorites yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f3f4f6" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#123047",
  },
  card: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  typeLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  itemName: { fontSize: 18, fontWeight: "600", color: "#123047" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },
});
