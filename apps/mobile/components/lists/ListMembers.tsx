import { apiErrorMessage } from "@/api/errors";
import { removeMember } from "@/api/lists";
import type { ListMember } from "@/types/lists";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type Props = {
  listId: string;
  members: ListMember[];
  viewerId?: string;
  isOwner: boolean;
  // Called after a member was removed so the list can refresh.
  onChanged: () => void;
};

export default function ListMembers({
  listId,
  members,
  viewerId,
  isOwner,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(listId, userId),
    onSuccess: onChanged,
    onError: (error) =>
      Toast.show({
        type: "error",
        text1: "Couldn't remove member",
        text2: apiErrorMessage(error, "Please try again."),
      }),
  });

  const confirmRemove = (member: ListMember) =>
    Alert.alert(
      `Remove ${member.full_name}?`,
      "They lose access to this list. They can rejoin with the invite code, so regenerate it if you want to keep them out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => remove.mutate(member.user_id),
        },
      ],
    );

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.toggleText}>Members ({members.length})</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#123047"
        />
      </Pressable>

      {open &&
        members.map((member) => {
          const isSelf = member.user_id === viewerId;
          return (
            <View key={member.user_id} style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>
                {member.full_name}
                {isSelf ? " (You)" : ""}
              </Text>
              <Text style={styles.role}>
                {member.role === "OWNER" ? "Owner" : "Member"}
              </Text>
              {isOwner && !isSelf && member.role !== "OWNER" && (
                <Pressable
                  onPress={() => confirmRemove(member)}
                  disabled={remove.isPending}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${member.full_name}`}
                >
                  <Ionicons
                    name="person-remove-outline"
                    size={20}
                    color="#b91c1c"
                  />
                </Pressable>
              )}
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  toggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: { color: "#123047", fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#eef2f6",
    marginTop: 8,
  },
  name: { flex: 1, color: "#123047" },
  role: { color: "#718096", fontSize: 12 },
});
