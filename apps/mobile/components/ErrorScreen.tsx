import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

// Shown by the root ErrorBoundary when the app crashes while rendering. It is rendered outside
// the app's providers, so it cannot use the theme context: it follows the device appearance
// directly and uses plain colours.
export function ErrorScreen({
  error,
  retry,
}: {
  error?: Error;
  retry: () => void | Promise<void>;
}) {
  const dark = useColorScheme() === "dark";
  const text = dark ? "#f8fafc" : "#0f172a";
  const muted = dark ? "#cbd5e1" : "#475569";
  return (
    <View
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: dark ? "#020617" : "#ffffff" }]}
    >
      <Text accessibilityRole="header" style={[styles.title, { color: text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.body, { color: muted }]}>
        The app hit an unexpected problem. Try again, and if it keeps happening,
        restart the app.
      </Text>
      {__DEV__ && error ? (
        <Text style={[styles.detail, { color: muted }]}>{error.message}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={() => void retry()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  body: { marginTop: 8, fontSize: 14, textAlign: "center", maxWidth: 320 },
  detail: { marginTop: 12, fontSize: 12, textAlign: "center" },
  button: {
    marginTop: 24,
    minHeight: 44,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
  },
  buttonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
});
