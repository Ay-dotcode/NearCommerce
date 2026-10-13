import { CATEGORIES_KEY, fetchCategories } from "@/api/catalog";
import { searchProducts } from "@/api/client";
import ProductCard from "@/components/ProductCard";
import { useSessionCoords } from "@/src/hooks/useSessionCoords";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductListSkeleton } from "@/components/skeletons";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";

export default function CategoryScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>();
  const coords = useSessionCoords();
  const radius = useSearchRadius();

  const categories = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
  const category = categories.data?.find((c) => c.id === id);

  const products = useQuery({
    queryKey: ["category-products", id, subcategoryId, coords, radius.meters],
    queryFn: () =>
      searchProducts(
        "",
        coords!.latitude,
        coords!.longitude,
        {
          categoryId: subcategoryId ? undefined : id,
          subcategoryId,
        },
        radius.meters,
      ),
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
          <Ionicons name="chevron-back" size={26} color={c.text} />
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

      {(products.isLoading || coords === null) && <ProductListSkeleton />}
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
          <ProductCard
            name={item.name}
            price={item.price}
            storeName={item.store_name}
            distanceMeters={item.distance_meters}
            inStock={item.in_stock}
            isStale={item.isStale}
            quantity={item.quantity}
            onPress={() => router.push(`/product/${item.id}`)}
          />
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
  const styles = useThemedStyles(makeStyles);

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

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16 },
    title: { color: c.text, fontSize: 24, fontWeight: "800", flex: 1 },
    chipScroll: { flexGrow: 0 },
    chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { color: c.text, fontWeight: "600" },
    chipTextSelected: { color: c.onPrimary },
    loader: { marginTop: 24 },
    message: { color: c.textMuted, textAlign: "center", margin: 24 },
    results: { padding: 16 },
    result: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    resultCopy: { flex: 1 },
    resultName: { color: c.text, fontSize: 15, fontWeight: "800" },
    storeName: { color: c.textMuted, fontSize: 12, marginTop: 4 },
    price: { color: c.text, fontWeight: "800" },
  });
