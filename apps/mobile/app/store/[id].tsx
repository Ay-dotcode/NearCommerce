import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Store" }} />
      <Text style={styles.title}>Store details</Text>
      <Text style={styles.message}>
        Store {id} is ready for its product catalogue.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f8fb",
    padding: 24,
  },
  title: { color: "#123047", fontSize: 26, fontWeight: "800" },
  message: { color: "#718096", marginTop: 8, textAlign: "center" },
});
