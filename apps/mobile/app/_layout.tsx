import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useLocationFetcher } from "../src/hooks/useLocationFetcher";

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isFetching } = useLocationFetcher();

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
        {isFetching && (
          <View style={styles.dynamicIslandFallback}>
            <Text style={styles.notificationText}>
              📍 Fetching precise location...
            </Text>
          </View>
        )}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <Toast />
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  dynamicIslandFallback: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 999,
    elevation: 5,
  },
  notificationText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
