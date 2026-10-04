import { CATEGORIES_KEY, fetchCategories } from "@/api/catalog";
import { searchProducts } from "@/api/client";
import { getSessionLocation } from "@/utils/location";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>();
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getSessionLocation().then((c) => {
      if (active) setCoords({ latitude: c.latitude, longitude: c.longitude });
    });
    return () => {
      active = false;
    };
  }, []);

  const categories = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
  const category = categories.data?.find((c) => c.id === id);

  const products = useQuery({
    queryKey: ["category-products", id, subcategoryId, coords],
    queryFn: () =>
      searchProducts("", coords!.latitude, coords!.longitude, {
        categoryId: subcategoryId ? undefined : id,
        subcategoryId,
      }),
    enabled: Boolean(id) && coords !== null,
  });
  const results = products.data?.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color="#123047" />
        </Pressable>
        <Text style={styles.title}>{category?.name ?? "Category"}</Text>
      </View>

      {category && category.subcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="All"
            selected={!subcategoryId}
            onPress={() => setSubcategoryId(undefined)}
          />
          {category.subcategories.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={subcategoryId === s.id}
              onPress={() => setSubcategoryId(s.id)}
            />
          ))}
        </ScrollView>
      )}

      {(products.isLoading || coords === null) && (
        <ActivityIndicator color="#2563eb" style={styles.loader} />
      )}
      {products.isError && (
        <Text style={styles.message}>
          Couldn't load products. Please try again.
        </Text>
      )}
      {products.isSuccess && results.length === 0 && (
        <Text style={styles.message}>
          No nearby products in this category yet.
        </Text>
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.results}
        renderItem={({ item }) => (
          <Pressable
            style={styles.result}
            onPress={() => router.push(`/product/${item.id}`)}
            accessibilityRole="button"
          >
            <View style={styles.resultCopy}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.storeName}>
                {item.store_name} ·{" "}
                {(item.distance_meters / 1609.34).toFixed(1)} mi
              </Text>
            </View>
            <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f8fb" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16 },
  title: { color: "#123047", fontSize: 24, fontWeight: "800", flex: 1 },
  chipScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e2ec",
  },
  chipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#123047", fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  loader: { marginTop: 24 },
  message: { color: "#718096", textAlign: "center", margin: 24 },
  results: { padding: 16 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resultCopy: { flex: 1 },
  resultName: { color: "#123047", fontSize: 15, fontWeight: "800" },
  storeName: { color: "#718096", fontSize: 12, marginTop: 4 },
  price: { color: "#123047", fontWeight: "800" },
});
