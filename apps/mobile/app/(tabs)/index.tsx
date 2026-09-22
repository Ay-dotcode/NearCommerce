import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import StoreCard from "@/components/StoreCard";

type Store = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distance: number;
};

const categories = [
  { label: "Groceries", icon: "basket-outline" as const },
  { label: "Pharmacy", icon: "medkit-outline" as const },
  { label: "Pet care", icon: "paw-outline" as const },
  { label: "Household", icon: "home-outline" as const },
];

const nearbyStores: Store[] = [
  {
    id: "nearby-market",
    name: "Nearby Market",
    isOpen: true,
    rating: 4.8,
    distance: 0.6,
  },
  {
    id: "corner-pharmacy",
    name: "Corner Pharmacy",
    isOpen: false,
    rating: 4.5,
    distance: 1.2,
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={nearbyStores}
        keyExtractor={(store) => store.id}
        ListHeaderComponent={
          <View>
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

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Stores near you</Text>
              <Text style={styles.caption}>Updated with local hours</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <StoreCard {...item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  searchButton: { backgroundColor: "#dbeafe", borderRadius: 14, padding: 12 },
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
  },
  caption: { color: "#718096", fontSize: 12 },
  separator: { height: 10 },
});
