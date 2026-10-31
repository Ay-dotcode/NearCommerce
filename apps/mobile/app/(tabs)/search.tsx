import { searchByImage, searchProducts } from "@/api/client";
import ProductCard from "@/components/ProductCard";
import { ProductListSkeleton } from "@/components/skeletons";
import {
  pickPhoto,
  type PhotoSource,
} from "@/helpers/photo";
import { openAppSettings } from "@/helpers/appSettings";
import { photoErrorMessage } from "@/helpers/photoErrors";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import { useSessionCoords } from "@/src/hooks/useSessionCoords";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { SCREEN_EDGES } from "@/theme/layout";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
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

export default function SearchScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const params = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q ?? "");
  const location = useSessionCoords();
  const radius = useSearchRadius();
  // Set once the server reports the vision model is down; photo search is then hidden
  // and text search carries on (SRS 3.2.1).
  const [visionUnavailable, setVisionUnavailable] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  // The camera permission was refused: only photo search stops working; offer a way back in.
  const [cameraDenied, setCameraDenied] = useState(false);

  const query = useQuery({
    queryKey: ["search", searchQuery, location, radius.meters, radius.nearbyOnly],
    queryFn: () =>
      searchProducts(
        searchQuery.trim(),
        location!.latitude,
        location!.longitude,
        {},
        radius.meters,
        radius.nearbyOnly,
      ),
    enabled: searchQuery.trim().length > 2 && location !== null,
  });

  const photoSearch = useMutation({
    mutationFn: async (source: PhotoSource) => {
      const photo = await pickPhoto(source);
      if (photo === "denied")
        throw Object.assign(new Error("denied"), { denied: true });
      if (photo === null) return null; // backed out of the picker
      return searchByImage(
        photo,
        location!.latitude,
        location!.longitude,
        radius.meters,
        radius.nearbyOnly,
      );
    },
    onMutate: () => {
      setPhotoNotice(null);
      setCameraDenied(false);
    },
    onError: (error) => {
      const code = (error as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === "VISION_UNAVAILABLE") setVisionUnavailable(true);
      else if ((error as { denied?: boolean }).denied) {
        setCameraDenied(true);
        setPhotoNotice(
          "Camera access is off. Allow it in Settings to search by photo.",
        );
      }
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
    <SafeAreaView style={styles.container} edges={SCREEN_EDGES}>
      <View style={styles.content}>
        <Text style={styles.heading}>Find nearby products</Text>
        <Text style={styles.subtitle}>
          Search across local stores in one place.
        </Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={c.textMuted} />
          <TextInput
            autoFocus
            style={styles.input}
            placeholder="Search nearby products"
            placeholderTextColor={c.placeholder}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setPhotoNotice(null);
              setCameraDenied(false);
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
                <Ionicons name="camera-outline" size={24} color={c.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Choose a photo from your library"
                accessibilityRole="button"
                disabled={photoSearch.isPending}
                onPress={() => startPhotoSearch("library")}
              >
                <Ionicons name="image-outline" size={22} color={c.primary} />
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
        {cameraDenied && (
          <Pressable
            accessibilityRole="button"
            testID="open-app-settings"
            onPress={openAppSettings}
          >
            <Text style={styles.settingsLink}>Open phone settings</Text>
          </Pressable>
        )}
        {showingPhoto && (
          <Text style={styles.detected}>
            Results for “{photoResult.detected_query}”
          </Text>
        )}
      </View>

      {busy && <ProductListSkeleton />}
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

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingBottom: 8 },
    heading: { color: c.text, fontSize: 26, fontWeight: "800" },
    subtitle: { color: c.textMuted, marginTop: 6, marginBottom: 18 },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    input: { flex: 1, color: c.text, fontSize: 16 },
    notice: { color: c.textMuted, fontSize: 12, marginTop: 10 },
    settingsLink: {
      color: c.primary,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 6,
    },
    detected: {
      color: c.text,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 12,
    },
    loader: { marginTop: 24 },
    message: { color: c.textMuted, textAlign: "center", margin: 24 },
    results: { padding: 20, paddingTop: 8 },
  });
