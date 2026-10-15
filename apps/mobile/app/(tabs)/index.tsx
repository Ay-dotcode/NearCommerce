import StoreCard from "@/components/StoreCard";
import { METERS_PER_MILE } from "@/constants";
import { useLocationFetcher } from "@/src/hooks/useLocationFetcher";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CATEGORIES_KEY,
  fetchCategories,
  fetchNearbyStores,
} from "@/api/catalog";
import {
  CategoryGridSkeleton,
  StoreListSkeleton,
} from "@/components/skeletons";
import { iconForCategory } from "@/helpers/categoryIcon";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { SCREEN_EDGES } from "@/theme/layout";
import type { Category } from "@/types/catalog";

export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const { location, isFetching: isFetchingLocation } = useLocationFetcher();

  const radius = useSearchRadius();
  const lat = location?.coords.latitude;
  const lng = location?.coords.longitude;

  const {
    data: stores = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["nearby-stores", lat, lng, radius.meters],
    queryFn: () => fetchNearbyStores(lat!, lng!, radius.meters),
    enabled: lat !== undefined && lng !== undefined,
  });

  // Map API response to the shape StoreCard expects
  const categoriesQuery = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
  const categories: Category[] = categoriesQuery.data ?? [];

  const storeCards = stores.map((s) => ({
    id: s.id,
    name: s.name,
    isOpen: s.is_open,
    rating: s.rating,
    distance: s.distance_meters / METERS_PER_MILE,
  }));

  return (
    <SafeAreaView style={styles.container} edges={SCREEN_EDGES}>
      <FlatList
        contentContainerStyle={styles.content}
        data={storeCards}
        keyExtractor={(store) => store.id}
        ListHeaderComponent={
          <View>
            {/* Header row */}
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>NEARCOMMERCE</Text>
                <Text style={styles.heading}>What do you need today?</Text>
              </View>
              <Link href="/(tabs)/search" asChild>
                <Pressable
                  accessibilityLabel="Search"
                  style={styles.searchButton}
                >
                  <Ionicons name="search" size={22} color={c.text} />
                </Pressable>
              </Link>
            </View>

            {/* Category grid */}
            <Text style={styles.sectionTitle}>Browse categories</Text>
            {categoriesQuery.isLoading && <CategoryGridSkeleton />}
            {categoriesQuery.isError && (
              <Text style={styles.emptyText}>
                Couldn't load categories. Pull to retry later.
              </Text>
            )}
            {categoriesQuery.isSuccess && categories.length === 0 && (
              <Text style={styles.emptyText}>No categories yet.</Text>
            )}
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={{
                    pathname: "/category/[id]",
                    params: { id: category.id },
                  }}
                  asChild
                >
                  <Pressable
                    style={styles.category}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${category.name}`}
                  >
                    <Ionicons
                      name={iconForCategory(category.name)}
                      size={24}
                      color={c.primary}
                    />
                    <Text style={styles.categoryLabel}>{category.name}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>

            {/* Section heading */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Stores near you</Text>
              <Text style={styles.caption}>Updated with local hours</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <StoreCard {...item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          isFetchingLocation || isLoading ? (
            <StoreListSkeleton />
          ) : isError ? (
            <Text style={styles.emptyText}>
              Couldn't load nearby stores. Check your connection.
            </Text>
          ) : (
            <Text style={styles.emptyText}>No stores found nearby.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingBottom: 32 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 28,
    },
    eyebrow: {
      color: c.primary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.4,
    },
    heading: {
      color: c.text,
      fontSize: 28,
      fontWeight: "800",
      marginTop: 6,
      maxWidth: 280,
    },
    searchButton: {
      backgroundColor: c.primarySoft,
      borderRadius: 14,
      padding: 12,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 14,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 28,
    },
    category: {
      width: "48%",
      minHeight: 82,
      justifyContent: "center",
      gap: 8,
      padding: 14,
      backgroundColor: c.surface,
      borderRadius: 12,
    },
    categoryLabel: { color: c.text, fontSize: 14, fontWeight: "700" },
    sectionHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 4,
    },
    caption: { color: c.textMuted, fontSize: 12 },
    separator: { height: 10 },
    loader: { marginTop: 24 },
    emptyText: {
      color: c.textMuted,
      textAlign: "center",
      marginTop: 24,
      fontSize: 14,
    },
  });
