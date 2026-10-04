import { apiErrorMessage } from "@/api/errors";
import { LISTS_KEY, createList, fetchLists } from "@/api/lists";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
import Toast from "react-native-toast-message";

export default function ListsScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const {
    data: lists = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: LISTS_KEY,
    queryFn: fetchLists,
  });

  const create = useMutation({
    mutationFn: (listName: string) => createList(listName),
    onSuccess: (list) => {
      setName("");
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      router.push(`/list/${list.id}` as never);
    },
    onError: (error) =>
      Toast.show({
        type: "error",
        text1: "Couldn't create list",
        text2: apiErrorMessage(error, "Please try again."),
      }),
  });

  const trimmed = name.trim();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your lists</Text>

      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder="New list name"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          maxLength={100}
          accessibilityLabel="New list name"
          returnKeyType="done"
          onSubmitEditing={() => trimmed && create.mutate(trimmed)}
        />
        <Pressable
          style={[
            styles.button,
            (!trimmed || create.isPending) && styles.disabled,
          ]}
          disabled={!trimmed || create.isPending}
          onPress={() => create.mutate(trimmed)}
          accessibilityRole="button"
          accessibilityLabel="Create list"
        >
          <Text style={styles.buttonText}>Create</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.joinLink}
        onPress={() => router.push("/(tabs)/lists/join" as never)}
        accessibilityRole="button"
      >
        <Ionicons name="enter-outline" size={18} color="#2563eb" />
        <Text style={styles.joinText}>Join with an invite code</Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator color="#2563eb" style={styles.loader} />
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
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f8fb", padding: 20 },
  title: {
    color: "#123047",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 16,
  },
  createRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#123047",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "800" },
  joinLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 14,
  },
  joinText: { color: "#2563eb", fontWeight: "700" },
  loader: { marginTop: 32 },
  centered: { alignItems: "center", gap: 10 },
  message: { color: "#718096", textAlign: "center", marginTop: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardCopy: { flex: 1 },
  cardTitle: { color: "#123047", fontSize: 17, fontWeight: "800" },
  cardMeta: { color: "#718096", fontSize: 13, marginTop: 4 },
});
