import { apiClient } from "@nearcommerce/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JoinListScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const queryClient = useQueryClient();

  const joinList = useMutation({
    mutationFn: async (code: string) =>
      apiClient.post("/lists/join", { invite_code: code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_lists"] });
      queryClient.invalidateQueries({ queryKey: ["my-list"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Invalid or expired invite code."),
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.title}>Join a Household List</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Invite Code"
        placeholderTextColor="#9ca3af"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
      />
      <Pressable
        style={[
          styles.button,
          (joinList.isPending || inviteCode.trim().length < 4) &&
            styles.buttonDisabled,
        ]}
        onPress={() => joinList.mutate(inviteCode.trim())}
        disabled={joinList.isPending || inviteCode.trim().length < 4}
      >
        <Text style={styles.buttonText}>
          {joinList.isPending ? "Joining..." : "Join List"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#123047",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 2,
    color: "#123047",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
