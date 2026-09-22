import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function ListsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your lists</Text>
      <Text style={styles.message}>Save products as you discover them.</Text>
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
  message: { color: "#718096", marginTop: 8 },
});
