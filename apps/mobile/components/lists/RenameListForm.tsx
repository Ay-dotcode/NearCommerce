import { apiErrorMessage } from "@/api/errors";
import { renameList } from "@/api/lists";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

type Props = {
  listId: string;
  name: string;
  // Called after a successful save or when the owner cancels.
  onDone: (saved: boolean) => void;
};

export default function RenameListForm({ listId, name, onDone }: Props) {
  const [value, setValue] = useState(name);
  const trimmed = value.trim();

  const save = useMutation({
    mutationFn: () => renameList(listId, trimmed),
    onSuccess: () => onDone(true),
    onError: (error) =>
      Toast.show({
        type: "error",
        text1: "Couldn't rename list",
        text2: apiErrorMessage(error, "Please try again."),
      }),
  });

  // Saving the same name is just a cancel.
  const submit = () => {
    if (!trimmed) return;
    if (trimmed === name) return onDone(false);
    save.mutate();
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        maxLength={100}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel="List name"
      />
      <Pressable
        onPress={submit}
        disabled={!trimmed || save.isPending}
        accessibilityRole="button"
        accessibilityLabel="Save name"
        style={[styles.save, (!trimmed || save.isPending) && styles.disabled]}
      >
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
      <Pressable
        onPress={() => onDone(false)}
        accessibilityRole="button"
        accessibilityLabel="Cancel rename"
      >
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#123047",
    fontSize: 18,
  },
  save: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  disabled: { opacity: 0.5 },
  saveText: { color: "#fff", fontWeight: "800" },
  cancel: { color: "#2563eb", fontWeight: "700" },
});
