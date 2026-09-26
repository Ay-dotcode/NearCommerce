import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchProducts } from "@/api/client";
import { getSessionLocation } from "@/utils/location";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.category ?? "");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isVisionAvailable] = useState(false);

  useEffect(() => {
    getSessionLocation().then((coords) => {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
    });
  }, []);

  const query = useQuery({
    queryKey: ["search", searchQuery, location],
    queryFn: () =>
      searchProducts(
        searchQuery.trim(),
        location!.latitude,
        location!.longitude,
      ),
    enabled: searchQuery.trim().length > 2 && location !== null,
  });

  const results = query.data?.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Find nearby products</Text>
        <Text style={styles.subtitle}>
          Search across local stores in one place.
        </Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#718096" />
          <TextInput
            autoFocus
            style={styles.input}
            placeholder="Search products or stores"
            placeholderTextColor="#9aa7b5"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {isVisionAvailable ? (
            <Pressable accessibilityLabel="Search by image">
              <Ionicons name="camera-outline" size={24} color="#2563eb" />
            </Pressable>
          ) : (
            <Ionicons name="image-outline" size={22} color="#b6c0ca" />
          )}
        </View>
        {!isVisionAvailable && searchQuery.length > 0 && (
          <Text style={styles.notice}>
            Image search is unavailable right now. Text search is still working.
          </Text>
        )}
      </View>

      {query.isLoading && (
        <ActivityIndicator color="#2563eb" style={styles.loader} />
      )}
      {query.isError && (
        <Text style={styles.message}>
          Search is unavailable. Please try again.
        </Text>
      )}
      {!query.isLoading && !query.isError && searchQuery.trim().length <= 2 && (
        <Text style={styles.message}>
          Type at least 3 characters to search nearby.
        </Text>
      )}
      {!query.isLoading &&
        !query.isError &&
        searchQuery.trim().length > 2 &&
        results.length === 0 && (
          <Text style={styles.message}>
            No nearby products matched that search.
          </Text>
        )}
      <FlatList
        data={results}
        contentContainerStyle={styles.results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.result}>
            <View style={styles.resultIcon}>
              <Ionicons name="pricetag-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.resultCopy}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.storeName}>
                {item.store_name} ·{" "}
                {(item.distance_meters / 1609.34).toFixed(1)} mi
              </Text>
            </View>
            <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f8fb" },
  content: { padding: 20, paddingBottom: 8 },
  heading: { color: "#123047", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#718096", marginTop: 6, marginBottom: 18 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d9e2ec",
  },
  input: { flex: 1, color: "#123047", fontSize: 16 },
  notice: { color: "#718096", fontSize: 12, marginTop: 10 },
  loader: { marginTop: 24 },
  message: { color: "#718096", textAlign: "center", margin: 24 },
  results: { padding: 20, paddingTop: 8 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resultIcon: { backgroundColor: "#dbeafe", borderRadius: 10, padding: 10 },
  resultCopy: { flex: 1 },
  resultName: { color: "#123047", fontSize: 15, fontWeight: "800" },
  storeName: { color: "#718096", fontSize: 12, marginTop: 4 },
  price: { color: "#123047", fontWeight: "800" },
});
