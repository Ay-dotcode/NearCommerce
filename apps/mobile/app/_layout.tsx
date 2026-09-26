import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { useLocationFetcher } from "../src/hooks/useLocationFetcher";

const queryClient = new QueryClient();

//  Inner layout — rendered inside AuthProvider so it can read auth state.
//  Redirects unauthenticated users to the login screen.
function AppShell() {
  const { token, isLoading } = useAuth();
  const { isFetching: isFetchingLocation } = useLocationFetcher();

  // Blank screen while AsyncStorage is being read on first mount
  if (isLoading) return null;

  return (
    <View style={{ flex: 1 }}>
      {/* Dynamic-island style location banner */}
      {isFetchingLocation && (
        <View style={styles.dynamicIslandFallback}>
          <Text style={styles.notificationText}>
            📍 Fetching precise location...
          </Text>
        </View>
      )}

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>

      {/* Redirect based on auth state */}
      {!token && <Redirect href="/(auth)/login" />}

      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
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
