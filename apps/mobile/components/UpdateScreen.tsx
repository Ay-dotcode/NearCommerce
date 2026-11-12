import { BrandIcon, Button } from "@/components/ui";
import { useUpdateInstaller } from "@/src/hooks/useUpdateInstaller";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  mode: "required" | "optional";
  current: string;
  latest: string;
  url: string;
  onContinue: () => void;
}

export function UpdateScreen({
  mode,
  current,
  latest,
  url,
  onContinue,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const required = mode === "required";
  const installer = useUpdateInstaller(url, latest);
  const { phase, progress } = installer;
  const inApp = installer.mode === "install";

  const carryOn = () => {
    installer.cancel();
    onContinue();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (required) BackHandler.exitApp();
        else carryOn();
        return true;
      },
    );
    return () => subscription.remove();
  }, [required, onContinue, installer.cancel]);

  const downloading = phase === "downloading";
  const working = downloading || phase === "installing";
  const percent = progress === null ? null : Math.round(progress * 100);

  const mainTitle =
    phase === "downloading"
      ? percent === null
        ? "Downloading…"
        : `Downloading… ${percent}%`
      : phase === "installing"
        ? "Opening the installer…"
        : phase === "failed"
          ? "Try again"
          : phase === "returned"
            ? "Install update"
            : inApp
              ? "Download update"
              : "Update";

  const message =
    phase === "failed"
      ? installer.failure === "download"
        ? "Couldn't download the update. Check your connection and try again."
        : installer.failure === "install"
          ? "Couldn't open the installer. Try again."
          : "Couldn't open the update page. Try again."
      : phase === "returned"
        ? "The installer was closed. If Android asked you to allow installs from Near Commerce, allow it, then tap Install update."
        : inApp
          ? "The update downloads here, then Android asks you to confirm the install."
          : "Opens the update page.";

  return (
    <View
      testID="update-screen"
      style={styles.root}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <BrandIcon size={64} />
          <View
            style={[styles.badge, required && styles.badgeRequired]}
            testID="update-badge"
          >
            <Ionicons
              name="cloud-download-outline"
              size={36}
              color={required ? c.dangerText : c.primaryText}
            />
          </View>

          <Text accessibilityRole="header" style={styles.title}>
            {required ? "Update required" : "Update available"}
          </Text>
          <Text style={styles.body}>
            {required
              ? `Near Commerce ${latest} is out. This version is no longer supported, so you need to update to keep using the app.`
              : `Near Commerce ${latest} is ready. You can update now, or keep using the app and update later.`}
          </Text>

          <View style={styles.versions}>
            <Text style={styles.versionText}>
              Your version <Text style={styles.versionValue}>{current}</Text>
            </Text>
            <Text style={styles.versionText}>
              New version <Text style={styles.versionValue}>{latest}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {downloading && (
            <View
              testID="update-progress"
              accessibilityRole="progressbar"
              accessibilityLabel="Download progress"
              accessibilityValue={
                percent === null
                  ? undefined
                  : { min: 0, max: 100, now: percent }
              }
              style={styles.track}
            >
              <View
                style={[
                  styles.bar,
                  { width: `${percent === null ? 35 : percent}%` },
                ]}
              />
            </View>
          )}

          <Button
            testID="update-button"
            title={mainTitle}
            disabled={working}
            onPress={() => void installer.start()}
          />

          {/* While downloading, the way out is Cancel (or Continue, which also cancels). */}
          {downloading && required && (
            <Button
              testID="update-cancel"
              title="Cancel"
              variant="secondary"
              onPress={installer.cancel}
            />
          )}
          {!required && (
            <Button
              testID="update-continue"
              title="Continue"
              variant="secondary"
              onPress={carryOn}
            />
          )}

          <Text
            testID="update-message"
            style={[styles.hint, phase === "failed" && styles.hintError]}
            accessibilityLiveRegion="polite"
          >
            {message}
          </Text>

          {inApp && phase === "failed" && (
            <Pressable
              testID="update-browser"
              accessibilityRole="link"
              onPress={installer.openInBrowser}
            >
              <Text style={styles.link}>Download in your browser instead</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
      backgroundColor: c.background,
    },
    safe: { flex: 1, paddingHorizontal: 24 },
    content: { flex: 1, alignItems: "center", justifyContent: "center" },
    badge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
      marginTop: 28,
      marginBottom: 24,
    },
    badgeRequired: { backgroundColor: c.dangerSoft },
    title: {
      color: c.text,
      fontSize: 26,
      fontWeight: "800",
      textAlign: "center",
    },
    body: {
      color: c.textSecondary,
      fontSize: 16,
      lineHeight: 23,
      textAlign: "center",
      marginTop: 12,
      maxWidth: 360,
    },
    versions: {
      marginTop: 22,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
      gap: 4,
    },
    versionText: { color: c.textMuted, fontSize: 14, textAlign: "center" },
    versionValue: { color: c.text, fontWeight: "700" },
    actions: { gap: 12, paddingBottom: 16 },
    hint: { color: c.textMuted, fontSize: 13, textAlign: "center" },
    hintError: { color: c.dangerText },
    link: {
      color: c.primaryText,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
      paddingVertical: 4,
    },
    track: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    bar: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  });
