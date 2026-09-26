import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient } from "@/api/client";
import { useHouseholdList } from "@/hooks/useHouseholdList";
import type { HouseholdListMeta } from "@/types/lists";

const accessToken =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.EXPO_PUBLIC_ACCESS_TOKEN ?? "";

export default function ListsScreen() {
  const queryClient = useQueryClient();
  const { data: listMeta, isLoading } = useQuery<HouseholdListMeta>({
    queryKey: ["my-list"],
    queryFn: async () =>
      (
        await apiClient.get<HouseholdListMeta>("/lists/my-list", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      ).data,
    enabled: Boolean(accessToken),
  });
  const { items, toggleItem, isConnected } = useHouseholdList(
    listMeta?.id ?? "",
    accessToken,
  );
  const regenerateCodeMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/lists/${listMeta?.id}/regenerate-invite`, undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    onSuccess: (response) => {
      queryClient.setQueryData<HouseholdListMeta>(["my-list"], (current) =>
        current
          ? { ...current, invite_code: response.data.invite_code }
          : current,
      );
      Toast.show({
        type: "success",
        text1: "Code Regenerated",
        text2: `New code: ${response.data.invite_code}`,
      });
    },
  });

  if (isLoading)
    return <ActivityIndicator color="#2563eb" style={styles.loader} />;

  if (!listMeta)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Your lists</Text>
        <Text style={styles.message}>
          Sign in with an active household list to see shared items.
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{listMeta.name}</Text>
          <View
            style={[
              styles.connection,
              isConnected ? styles.online : styles.offline,
            ]}
          />
        </View>
        <Text style={styles.inviteCode}>
          Invite code: {listMeta.invite_code}
        </Text>
        {listMeta.role === "OWNER" && (
          <Pressable
            style={styles.regenerateButton}
            onPress={() => regenerateCodeMutation.mutate()}
            disabled={regenerateCodeMutation.isPending}
          >
            <Ionicons name="refresh-outline" size={18} color="#991b1b" />
            <Text style={styles.regenerateText}>Regenerate invite code</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.message}>Your shared list is empty.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.itemRow}
            onPress={() =>
              toggleItem(item.product_id ?? item.id, !item.is_checked)
            }
          >
            <Ionicons
              name={item.is_checked ? "checkbox" : "square-outline"}
              size={24}
              color={item.is_checked ? "#10b981" : "#6b7280"}
            />
            <Text
              style={[styles.itemName, item.is_checked && styles.itemChecked]}
            >
              {item.custom_item_name || "Product"} (x{item.quantity})
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f8fb",
    padding: 24,
  },
  loader: { flex: 1, alignSelf: "center", marginTop: 32 },
  header: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: "#123047", fontSize: 24, fontWeight: "800" },
  connection: { width: 8, height: 8, borderRadius: 4 },
  online: { backgroundColor: "#10b981" },
  offline: { backgroundColor: "#f59e0b" },
  inviteCode: { color: "#4b5563", marginTop: 6 },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    padding: 10,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  regenerateText: { color: "#991b1b", fontWeight: "800" },
  message: { color: "#718096", textAlign: "center", marginTop: 24 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemName: { color: "#123047", fontSize: 16, marginLeft: 12 },
  itemChecked: { textDecorationLine: "line-through", color: "#9ca3af" },
});
