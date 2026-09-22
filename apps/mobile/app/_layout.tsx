import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { pollSessionLocation } from "@/utils/location";

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    void pollSessionLocation();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <Toast />
    </QueryClientProvider>
  );
}
