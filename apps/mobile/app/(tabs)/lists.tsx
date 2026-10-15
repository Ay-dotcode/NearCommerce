import { LISTS_KEY, createList, fetchLists } from "@/api/lists";
import { ListCardsSkeleton } from "@/components/skeletons";
import { InlineForm } from "@/forms/InlineForm";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { SCREEN_EDGES } from "@/theme/layout";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListsScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();

  const queryClient = useQueryClient();
  const {
    data: lists = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: LISTS_KEY,
    queryFn: fetchLists,
  });

  return (
    <SafeAreaView style={styles.container} edges={SCREEN_EDGES}>
      <Text style={styles.title}>Your lists</Text>

      <InlineForm
        accessibilityLabel="New list name"
        placeholder="New list name"
        maxLength={100}
        submitLabel="Create"
        submitAccessibilityLabel="Create list"
        errorFallback="Couldn't create the list. Please try again."
        onSubmit={async (listName) => {
          const list = await createList(listName);
          queryClient.invalidateQueries({ queryKey: LISTS_KEY });
          router.push(`/list/${list.id}` as never);
        }}
      />

      <Pressable
        style={styles.joinLink}
        onPress={() => router.push("/(tabs)/lists/join" as never)}
        accessibilityRole="button"
      >
        <Ionicons name="enter-outline" size={18} color={c.primary} />
        <Text style={styles.joinText}>Join with an invite code</Text>
      </Pressable>

      {isLoading ? (
        <ListCardsSkeleton />
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.message}>Couldn't load your lists.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.joinText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          ListEmptyComponent={
            <Text style={styles.message}>
              No lists yet. Create one above or join with an invite code.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/list/${item.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name}`}
            >
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.unchecked_count ?? 0} to buy · {item.member_count ?? 1}{" "}
                  {(item.member_count ?? 1) === 1 ? "member" : "members"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={c.placeholder}
              />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 20 },
    title: {
      color: c.text,
      fontSize: 26,
      fontWeight: "800",
      marginBottom: 16,
    },
    createRow: { flexDirection: "row", gap: 8 },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.text,
      fontSize: 16,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 18,
      justifyContent: "center",
    },
    disabled: { opacity: 0.5 },
    buttonText: { color: c.onPrimary, fontWeight: "800" },
    joinLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginVertical: 14,
    },
    joinText: { color: c.primary, fontWeight: "700" },
    loader: { marginTop: 32 },
    centered: { alignItems: "center", gap: 10 },
    message: { color: c.textMuted, textAlign: "center", marginTop: 24 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },
    cardCopy: { flex: 1 },
    cardTitle: { color: c.text, fontSize: 17, fontWeight: "800" },
    cardMeta: { color: c.textMuted, fontSize: 13, marginTop: 4 },
  });
