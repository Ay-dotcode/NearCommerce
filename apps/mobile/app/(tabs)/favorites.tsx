import { FAVORITES_KEY, fetchFavorites } from "@/api/favorites";
import { SwipeToOpenSettings } from "@/components/settings/SwipeToOpenSettings";
import { FavoriteListSkeleton } from "@/components/skeletons";
import { useRemoveFavorite } from "@/src/hooks/useFavorites";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { SCREEN_EDGES } from "@/theme/layout";
import type { FavoriteItem } from "@/types/favorites";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Filter = "all" | "store" | "product";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "store", label: "Stores" },
  { key: "product", label: "Products" },
];

export default function FavoritesScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const [filter, setFilter] = useState<Filter>("all");
  const {
    data: favorites = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: fetchFavorites,
  });
  const remove = useRemoveFavorite();

  const visible = favorites.filter(
    (f) => filter === "all" || f.type === filter,
  );

  return (
    <SwipeToOpenSettings>
      <SafeAreaView style={styles.container} edges={SCREEN_EDGES}>
        <Text style={styles.title}>Your Favorites</Text>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.key }}
              style={[styles.chip, filter === f.key && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === f.key && styles.chipTextSelected,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <FavoriteListSkeleton />
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.empty}>Couldn't load your favorites.</Text>
            <Pressable onPress={() => refetch()} accessibilityRole="button">
              <Text style={styles.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FavoriteRow
                item={item}
                removing={remove.isPending && remove.variables === item.id}
                onRemove={() => remove.mutate(item.id)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {favorites.length === 0
                  ? "You haven't saved any favorites yet. Tap the heart on a store or product to save it."
                  : `No favorite ${filter === "store" ? "stores" : "products"} yet.`}
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </SwipeToOpenSettings>
  );
}

function FavoriteRow({
  item,
  onRemove,
  removing,
}: {
  item: FavoriteItem;
  onRemove: () => void;
  removing: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const isStore = item.type === "store";
  const name = isStore ? item.store?.name : item.product?.name;
  const detail = isStore
    ? item.store
      ? `${item.store.is_open ? "Open now" : "Closed"}${
          item.store.rating > 0 ? ` · ★ ${item.store.rating.toFixed(1)}` : ""
        }`
      : ""
    : item.product
      ? `$${Number(item.product.price).toFixed(2)} · ${item.product.store_name}${
          item.product.in_stock ? "" : " · Out of stock"
        }`
      : "";

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.cardBody}
        onPress={() =>
          router.push(
            (isStore
              ? `/store/${item.store_id}`
              : `/product/${item.product_id}`) as never,
          )
        }
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <Ionicons
            name={isStore ? "storefront" : "pricetag"}
            size={18}
            color={c.textMuted}
          />
          <Text style={styles.typeLabel}>{isStore ? "Store" : "Product"}</Text>
        </View>
        <Text style={styles.itemName}>
          {name ?? (isStore ? "Store" : "Product")}
        </Text>
        {detail !== "" && <Text style={styles.detail}>{detail}</Text>}
      </Pressable>
      <Pressable
        onPress={onRemove}
        disabled={removing}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${name ?? "favorite"} from favorites`}
        style={styles.remove}
      >
        <Ionicons name="heart" size={24} color={c.heart} />
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: c.surfaceAlt },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 12,
      color: c.text,
    },
    filters: { flexDirection: "row", gap: 8, marginBottom: 12 },
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
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 8,
      marginBottom: 10,
      elevation: 1,
    },
    cardBody: { flex: 1, padding: 15 },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    typeLabel: {
      marginLeft: 8,
      fontSize: 12,
      color: c.textMuted,
      textTransform: "uppercase",
      fontWeight: "bold",
    },
    itemName: { fontSize: 18, fontWeight: "600", color: c.text },
    detail: { fontSize: 13, color: c.textMuted, marginTop: 4 },
    remove: { padding: 15 },
    centered: { alignItems: "center", marginTop: 40, gap: 12 },
    retry: { color: c.primary, fontWeight: "700" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      marginTop: 40,
      paddingHorizontal: 16,
    },
  });
