import { apiErrorMessage } from "@/api/errors";
import { addListItem, fetchLists } from "@/api/lists";
import FavoriteButton from "@/components/FavoriteButton";
import { ALREADY_ON_LIST_MESSAGE } from "@/types/lists";
import { apiClient } from "@nearcommerce/api";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

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

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await apiClient.get<ProductDetail>(`/products/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const addToList = async (listId: string, listName: string) => {
    try {
      const item = await addListItem(listId, { product_id: id });
      Toast.show(
        item.already_on_list
          ? {
              type: "info",
              text1: "Item Updated",
              text2: ALREADY_ON_LIST_MESSAGE(item.quantity),
            }
          : { type: "success", text1: `Added to ${listName}` },
      );
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Couldn't add to list",
        text2: apiErrorMessage(error, "Please try again."),
      });
    }
  };

  const onAddToList = async () => {
    try {
      const lists = await fetchLists();
      if (lists.length === 0) return router.push("/(tabs)/lists");
      if (lists.length === 1) return addToList(lists[0].id, lists[0].name);
      Alert.alert("Add to which list?", undefined, [
        ...lists.slice(0, 5).map((l) => ({
          text: l.name,
          onPress: () => addToList(l.id, l.name),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Couldn't load your lists",
        text2: apiErrorMessage(error, "Please try again."),
      });
    }
  };

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
        <FavoriteButton productId={product.id} />
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
        <Pressable style={styles.actionButton} onPress={onAddToList}>
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
