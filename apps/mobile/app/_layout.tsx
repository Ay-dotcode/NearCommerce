import { AnimatedSplash } from "@/components/AnimatedSplash";
import LocationFallbackModal from "@/components/LocationFallbackModal";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import ToastHost from "@/components/ToastHost";
import { DialogProvider } from "@/components/ui";
import { API_URL } from "@/constants";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/src/context/OnboardingContext";
import { SettingsProvider } from "@/src/context/SettingsContext";
import { useLocationFetcher } from "@/src/hooks/useLocationFetcher";
import {
  useColors,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from "@/theme";
import { navigationTheme } from "@/theme/navigation";
import { configureApiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

configureApiClient({ baseURL: API_URL });

const queryClient = new QueryClient();

// Asks for the phone's location and shows the "fetching location" pill. It is kept apart from
// the rest of the shell so a first-time shopper can read why location is needed (in the
// introduction) before the phone's permission prompt appears.
function LocationLayer({ signedIn }: { signedIn: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const {
    isFetching: isFetchingLocation,
    permissionDenied,
    manualLocation,
  } = useLocationFetcher();
  const [fallbackDismissed, setFallbackDismissed] = useState(false);
  return (
    <>
      {isFetchingLocation && (
        <View style={styles.dynamicIslandFallback}>
          <Text style={styles.notificationText}>
            📍 Fetching precise location...
          </Text>
        </View>
      )}
      {/* Without GPS permission the shopper can still pick a location by ZIP */}
      <LocationFallbackModal
        visible={
          signedIn && permissionDenied && !manualLocation && !fallbackDismissed
        }
        onClose={() => setFallbackDismissed(true)}
      />
    </>
  );
}

//  Inner layout — rendered inside AuthProvider so it can read auth state.
//  Redirects unauthenticated users to the login screen.
function AppShell() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const { token, isLoading } = useAuth();
  const onboarding = useOnboarding();
  const [splashDone, setSplashDone] = useState(false);
  // The opening animation stays until sign-in state and the "seen the guide" flag are known.
  const ready = !isLoading && onboarding.loaded;

  return (
    <View style={styles.root}>
      {!isLoading && (
        <>
          {onboarding.loaded && !onboarding.firstRun && Boolean(token) && (
            <LocationLayer signedIn={Boolean(token)} />
          )}

          <SettingsProvider>
            <Stack
              screenOptions={{
                // Every page change slides in from the right (and back out on return).
                animation: "slide_from_right",
                headerStyle: { backgroundColor: c.surface },
                headerTintColor: c.text,
                headerTitleStyle: { color: c.text, fontWeight: "700" },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: c.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(auth)"
                options={{ headerShown: false, animation: "fade" }}
              />
              <Stack.Screen
                name="category/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="list/[id]" options={{ headerShown: false }} />
              <Stack.Screen
                name="review/index"
                options={{ title: "Review", animation: "slide_from_bottom" }}
              />
            </Stack>
          </SettingsProvider>

          {/* Redirect based on auth state */}
          {!token && <Redirect href="/(auth)/login" />}
        </>
      )}

      {/* First launch (or replayed from Settings): the introduction covers the app. */}
      {ready && onboarding.visible && (
        <OnboardingScreen onFinish={onboarding.finish} />
      )}

      <ToastHost />

      {!splashDone && (
        <AnimatedSplash ready={ready} onDone={() => setSplashDone(true)} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <ThemeProvider value={navigationTheme(theme)}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DialogProvider>
            <OnboardingProvider>
              <AppShell />
            </OnboardingProvider>
          </DialogProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
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
