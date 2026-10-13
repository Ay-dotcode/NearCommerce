import { apiErrorMessage } from "@/api/errors";
import {
  LISTS_KEY,
  addListItem,
  deleteList,
  deleteListItem,
  fetchList,
  leaveList,
  listKey,
  regenerateInvite,
  setItemChecked,
} from "@/api/lists";
import ListMembers from "@/components/lists/ListMembers";
import RenameListForm from "@/components/lists/RenameListForm";
import { useListLiveUpdates } from "@/hooks/useHouseholdList";
import { useAuth } from "@/src/context/AuthContext";
import type { HouseholdListDetail, HouseholdListItem } from "@/types/lists";
import { ALREADY_ON_LIST_MESSAGE } from "@/types/lists";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { ListDetailSkeleton } from "@/components/skeletons";
import { InlineForm, useDialogs } from "@/components/ui";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";

export default function ListDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const { confirm } = useDialogs();
  const c = useColors();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);

  const onGone = useCallback((reason: "deleted" | "revoked") => {
    Toast.show({
      type: "info",
      text1: reason === "deleted" ? "List deleted" : "Access removed",
      text2:
        reason === "deleted"
          ? "The owner deleted this list."
          : "You're no longer a member of this list.",
    });
    router.replace("/(tabs)/lists" as never);
  }, []);
  const { isConnected } = useListLiveUpdates(id ?? "", token, { onGone });

  const list = useQuery({
    queryKey: listKey(id ?? ""),
    queryFn: () => fetchList(id!),
    enabled: Boolean(id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: listKey(id!) });
    queryClient.invalidateQueries({ queryKey: LISTS_KEY });
  };
  const onError = (title: string) => (error: unknown) =>
    Toast.show({
      type: "error",
      text1: title,
      text2: apiErrorMessage(error, "Please try again."),
    });

  const add = useMutation({
    mutationFn: (name: string) => addListItem(id!, { custom_item_name: name }),
    onSuccess: (item) => {
      if (item.already_on_list) {
        Toast.show({
          type: "info",
          text1: "Item Updated",
          text2: ALREADY_ON_LIST_MESSAGE(item.quantity),
        });
      }
      refresh();
    },
  });

  const toggle = useMutation({
    mutationFn: (item: HouseholdListItem) =>
      setItemChecked(id!, item.id, !item.is_checked),
    onSuccess: refresh,
    onError: onError("Couldn't update item"),
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => deleteListItem(id!, itemId),
    onSuccess: refresh,
    onError: onError("Couldn't remove item"),
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateInvite(id!),
    onSuccess: (res) => {
      queryClient.setQueryData<HouseholdListDetail>(listKey(id!), (cur) =>
        cur ? { ...cur, invite_code: res.invite_code } : cur,
      );
      Toast.show({
        type: "success",
        text1: "Code Regenerated",
        text2: `New code: ${res.invite_code}`,
      });
    },
    onError: onError("Couldn't regenerate code"),
  });

  const leaveOrDelete = useMutation({
    mutationFn: (isOwner: boolean) =>
      isOwner ? deleteList(id!) : leaveList(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      router.replace("/(tabs)/lists" as never);
    },
    onError: onError("Couldn't update list"),
  });

  if (list.isLoading)
    return (
      <SafeAreaView style={styles.container}>
        <ListDetailSkeleton />
      </SafeAreaView>
    );

  if (list.isError || !list.data)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>This list isn't available.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );

  const data = list.data;
  const isOwner = data.role === "OWNER";

  const confirmLeave = async () => {
    const ok = await confirm({
      title: isOwner ? "Delete this list?" : "Leave this list?",
      message: isOwner
        ? "This removes the list for every member."
        : "You can rejoin later with an invite code.",
      confirmLabel: isOwner ? "Delete" : "Leave",
      destructive: true,
    });
    if (ok) leaveOrDelete.mutate(isOwner);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        {renaming ? (
          <RenameListForm
            listId={id!}
            name={data.name}
            onDone={(saved) => {
              setRenaming(false);
              if (saved) refresh();
            }}
          />
        ) : (
          <>
            <Text style={styles.title} numberOfLines={1}>
              {data.name}
            </Text>
            {isOwner && (
              <Pressable
                onPress={() => setRenaming(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Rename list"
              >
                <Ionicons name="pencil" size={18} color={c.primary} />
              </Pressable>
            )}
          </>
        )}
        <View
          accessibilityLabel={isConnected ? "Live updates on" : "Offline"}
          style={[styles.dot, isConnected ? styles.online : styles.offline]}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.inviteCode}>Invite code: {data.invite_code}</Text>
        <ListMembers
          listId={id!}
          members={data.members}
          viewerId={data.viewer_id}
          isOwner={isOwner}
          onChanged={refresh}
        />
        <View style={styles.actions}>
          {isOwner && (
            <Pressable
              style={styles.actionButton}
              onPress={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={16} color={c.dangerText} />
              <Text style={styles.actionText}>Regenerate invite code</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.actionButton}
            onPress={confirmLeave}
            disabled={leaveOrDelete.isPending}
            accessibilityRole="button"
          >
            <Ionicons name="exit-outline" size={16} color={c.dangerText} />
            <Text style={styles.actionText}>
              {isOwner ? "Delete list" : "Leave list"}
            </Text>
          </Pressable>
        </View>
      </View>

      <InlineForm
        accessibilityLabel="Add an item"
        placeholder="Add an item"
        maxLength={255}
        submitIcon="add"
        submitAccessibilityLabel="Add item"
        errorFallback="Couldn't add the item. Please try again."
        onSubmit={(item) => add.mutateAsync(item)}
      />

      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.message}>Your shared list is empty.</Text>
        }
        renderItem={({ item }) => {
          const label = item.custom_item_name || item.item_name || "Product";
          return (
            <View style={styles.itemRow}>
              <Pressable
                style={styles.itemMain}
                onPress={() => toggle.mutate(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.is_checked }}
                accessibilityLabel={label}
              >
                <Ionicons
                  name={item.is_checked ? "checkbox" : "square-outline"}
                  size={24}
                  color={item.is_checked ? c.success : c.textMuted}
                />
                <Text
                  style={[
                    styles.itemName,
                    item.is_checked && styles.itemChecked,
                  ]}
                >
                  {label} (x{item.quantity})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => remove.mutate(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${label}`}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={c.placeholder}
                />
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 20 },
    loader: { marginTop: 32 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    title: { color: c.text, fontSize: 24, fontWeight: "800", flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    online: { backgroundColor: c.success },
    offline: { backgroundColor: c.warningStrong },
    header: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    inviteCode: { color: c.text, fontWeight: "700" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 10,
      backgroundColor: c.dangerSoft,
      borderRadius: 8,
    },
    actionText: { color: c.dangerText, fontWeight: "800" },
    addRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
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
    addButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      width: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: { opacity: 0.5 },
    message: { color: c.textMuted, textAlign: "center", marginTop: 24 },
    link: {
      color: c.primary,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 12,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    itemMain: { flex: 1, flexDirection: "row", alignItems: "center" },
    itemName: { color: c.text, fontSize: 16, marginLeft: 12, flex: 1 },
    itemChecked: { textDecorationLine: "line-through", color: c.placeholder },
  });
