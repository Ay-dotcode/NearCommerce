import { searchByImage, searchProducts } from "@/api/client";
import ProductCard from "@/components/ProductCard";
import { useSessionCoords } from "@/src/hooks/useSessionCoords";
import { pickPhoto, type PhotoSource } from "@/utils/photo";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

const VISION_UNAVAILABLE_NOTICE =
  "Image search is unavailable right now. Text search is still working.";

// Maps a failed photo search to what the shopper should read.
function photoErrorMessage(error: unknown): string {
  const code = (error as { response?: { data?: { code?: string } } })?.response
    ?.data?.code;
  if (code === "NO_PRODUCT_DETECTED")
    return "We couldn't spot a product in that photo. Try another angle.";
  return "Photo search failed. Please try again.";
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q ?? "");
  const location = useSessionCoords();
  // Set once the server reports the vision model is down; photo search is then hidden
  // and text search carries on (SRS 3.2.1).
  const [visionUnavailable, setVisionUnavailable] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

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

  const photoSearch = useMutation({
    mutationFn: async (source: PhotoSource) => {
      const photo = await pickPhoto(source);
      if (photo === "denied")
        throw Object.assign(new Error("denied"), { denied: true });
      if (photo === null) return null; // backed out of the picker
      return searchByImage(photo, location!.latitude, location!.longitude);
    },
    onMutate: () => setPhotoNotice(null),
    onError: (error) => {
      const code = (error as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === "VISION_UNAVAILABLE") setVisionUnavailable(true);
      else if ((error as { denied?: boolean }).denied)
        setPhotoNotice(
          "Camera access is off. Allow it in Settings to search by photo.",
        );
      else setPhotoNotice(photoErrorMessage(error));
    },
  });

  const startPhotoSearch = (source: PhotoSource) => {
    if (!location) {
      setPhotoNotice("We need your location to search nearby.");
      return;
    }
    setSearchQuery("");
    photoSearch.mutate(source);
  };

  const photoResult = photoSearch.data ?? null;
  const showingPhoto = photoResult !== null && searchQuery.trim() === "";
  const results = showingPhoto ? photoResult.data : (query.data?.data ?? []);
  const typed = searchQuery.trim().length > 2;
  const busy = query.isLoading || photoSearch.isPending;

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
            placeholder="Search nearby products"
            placeholderTextColor="#9aa7b5"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setPhotoNotice(null);
            }}
            returnKeyType="search"
          />
          {!visionUnavailable && (
            <>
              <Pressable
                accessibilityLabel="Search by photo"
                accessibilityRole="button"
                disabled={photoSearch.isPending}
                onPress={() => startPhotoSearch("camera")}
              >
                <Ionicons name="camera-outline" size={24} color="#2563eb" />
              </Pressable>
              <Pressable
                accessibilityLabel="Choose a photo from your library"
                accessibilityRole="button"
                disabled={photoSearch.isPending}
                onPress={() => startPhotoSearch("library")}
              >
                <Ionicons name="image-outline" size={22} color="#2563eb" />
              </Pressable>
            </>
          )}
        </View>
        {visionUnavailable && (
          <Text style={styles.notice}>{VISION_UNAVAILABLE_NOTICE}</Text>
        )}
        {photoNotice && (
          <Text accessibilityRole="alert" style={styles.notice}>
            {photoNotice}
          </Text>
        )}
        {showingPhoto && (
          <Text style={styles.detected}>
            Results for “{photoResult.detected_query}”
          </Text>
        )}
      </View>

      {busy && <ActivityIndicator color="#2563eb" style={styles.loader} />}
      {!busy && !showingPhoto && query.isError && (
        <Text style={styles.message}>
          Search is unavailable. Please try again.
        </Text>
      )}
      {!busy && !showingPhoto && !query.isError && !typed && !photoNotice && (
        <Text style={styles.message}>
          Type at least 3 characters to search nearby.
        </Text>
      )}
      {!busy &&
        !query.isError &&
        results.length === 0 &&
        (typed || showingPhoto) && (
          <Text style={styles.message}>
            No nearby products matched that search.
          </Text>
        )}
      <FlatList
        data={results}
        contentContainerStyle={styles.results}
        keyExtractor={(item) => item.id}
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
  detected: {
    color: "#123047",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
  loader: { marginTop: 24 },
  message: { color: "#718096", textAlign: "center", margin: 24 },
  results: { padding: 20, paddingTop: 8 },
});
