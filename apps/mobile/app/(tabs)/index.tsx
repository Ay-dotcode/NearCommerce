import StoreCard from "@/components/StoreCard";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@nearcommerce/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocationFetcher } from "../../src/hooks/useLocationFetcher";

const categories = [
  { label: "Groceries", icon: "basket-outline" as const },
  { label: "Pharmacy", icon: "medkit-outline" as const },
  { label: "Pet care", icon: "paw-outline" as const },
  { label: "Household", icon: "home-outline" as const },
];

interface NearbyStore {
  id: string;
  name: string;
  is_open: boolean;
  rating: number;
  distance_meters: number;
}

async function fetchNearbyStores(lat: number, lng: number) {
  const res = await apiClient.get<{ stores: NearbyStore[] }>("/search/stores", {
    params: { lat, lng },
  });
  return res.data.stores;
}

export default function HomeScreen() {
  const { location, isFetching: isFetchingLocation } = useLocationFetcher();

  const lat = location?.coords.latitude;
  const lng = location?.coords.longitude;

  const {
    data: stores = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["nearby-stores", lat, lng],
    queryFn: () => fetchNearbyStores(lat!, lng!),
    enabled: lat !== undefined && lng !== undefined,
  });

  // Map API response to the shape StoreCard expects
  const storeCards = stores.map((s) => ({
    id: s.id,
    name: s.name,
    isOpen: s.is_open,
    rating: s.rating,
    distance: s.distance_meters / 1000, // convert to km
  }));

  return (
    <SafeAreaView style={styles.container}>
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
                  <Ionicons name="search" size={22} color="#123047" />
                </Pressable>
              </Link>
            </View>

            {/* Category grid */}
            <Text style={styles.sectionTitle}>Browse categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <Link
                  key={category.label}
                  href={{
                    pathname: "/search",
                    params: { category: category.label },
                  }}
                  asChild
                >
                  <Pressable style={styles.category}>
                    <Ionicons name={category.icon} size={24} color="#2563eb" />
                    <Text style={styles.categoryLabel}>{category.label}</Text>
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
            <ActivityIndicator color="#2563eb" style={styles.loader} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f8fb" },
  content: { padding: 20, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  heading: {
    color: "#123047",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    maxWidth: 280,
  },
  searchButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 14,
    padding: 12,
  },
  sectionTitle: {
    color: "#123047",
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
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  categoryLabel: { color: "#123047", fontSize: 14, fontWeight: "700" },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  caption: { color: "#718096", fontSize: 12 },
  separator: { height: 10 },
  loader: { marginTop: 24 },
  emptyText: {
    color: "#718096",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
});
