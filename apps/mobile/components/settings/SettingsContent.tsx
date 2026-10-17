import { apiErrorMessage } from "@/api/errors";
import VerifyEmailPrompt from "@/components/VerifyEmailPrompt";
import {
  Button,
  SegmentedControl,
  Slider,
  useDialogs,
} from "@/components/ui";
import {
  AVOID_TOLLS_KEY,
  SEARCH_RADIUS_MAX_KM,
  SEARCH_RADIUS_MIN_KM,
} from "@/constants";
import { switchToDeviceLocation } from "@/helpers/location";
import { notify } from "@/helpers/notify";
import { useAuth } from "@/src/context/AuthContext";
import { useDeviceLocationName } from "@/src/hooks/useDeviceLocationName";
import { useManualLocation } from "@/src/hooks/useManualLocation";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import { useThemePreference } from "@/src/hooks/useThemePreference";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { apiClient } from "@nearcommerce/api";
import {
  formatKm,
  THEME_LABELS,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@nearcommerce/helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

interface Props {
  onOpenZip: () => void;
  onOpenSupport: () => void;
  // Closes the drawer. Used before leaving the screen (signing out) and after actions whose
  // confirmation pop-up must not be hidden behind the drawer.
  onClose: () => void;
}

const THEME_OPTIONS = THEME_PREFERENCES.map((value) => ({
  value,
  label: THEME_LABELS[value],
}));

// Everything a shopper can configure, shown inside the settings drawer.
export default function SettingsContent({
  onOpenZip,
  onOpenSupport,
  onClose,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const { confirm } = useDialogs();
  const c = useColors();
  const { logout } = useAuth();
  const manualLocation = useManualLocation();
  const radius = useSearchRadius();
  const theme = useThemePreference();
  const [draftKm, setDraftKm] = useState<number | null>(null);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [locating, setLocating] = useState(false);
  const deviceName = useDeviceLocationName(!manualLocation);

  useEffect(() => {
    AsyncStorage.getItem(AVOID_TOLLS_KEY).then((stored) => {
      if (stored !== null) setAvoidTolls(stored === "true");
    });
  }, []);

  const toggleTolls = async (value: boolean) => {
    setAvoidTolls(value);
    await AsyncStorage.setItem(AVOID_TOLLS_KEY, String(value));
  };

  const switchToDevice = async () => {
    setLocating(true);
    const result = await switchToDeviceLocation();
    setLocating(false);
    // Close first: pop-ups cannot show on top of the drawer.
    onClose();
    if (result.ok)
      notify.success(
        "Now using your device location",
        result.placeName
          ? `Showing shops near ${result.placeName}.`
          : "Showing shops near where you are.",
      );
    else
      notify.error(
        result.reason === "denied"
          ? "Location access is off"
          : "Couldn't read your location",
        result.reason === "denied"
          ? "Allow location in your phone's settings, or set a ZIP code instead."
          : "Please try again, or set a ZIP code instead.",
      );
  };

  // Close the drawer, let it finish sliding away, then sign out (which goes to the login page).
  const signOut = async () => {
    onClose();
    await new Promise((resolve) => setTimeout(resolve, SIGN_OUT_DELAY_MS));
    await logout();
  };

  const deleteAccount = async () => {
    try {
      await apiClient.delete("/users/me");
      await signOut();
    } catch (error) {
      notify.error(
        "Couldn't delete account",
        apiErrorMessage(error, "Please try again."),
      );
    }
  };

  const confirmDeleteAccount = async () => {
    const ok = await confirm({
      title: "Delete your account?",
      message:
        "This permanently removes your account, favorites and reviews. Household lists you own pass to the next member, or are deleted if you are the only member. This cannot be undone.",
      confirmLabel: "Delete account",
      destructive: true,
    });
    if (ok) await deleteAccount();
  };

  const shownKm = draftKm ?? radius.km;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <VerifyEmailPrompt />

      <Text style={styles.section}>Search distance</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.label}>Only show shops near me</Text>
            <Text style={styles.hint}>
              {radius.nearbyOnly
                ? "Shops farther away are hidden."
                : "Every shop is shown, nearest first."}
            </Text>
          </View>
          <Switch
            testID="nearby-switch"
            value={radius.nearbyOnly}
            onValueChange={(value) => void radius.setNearbyOnly(value)}
            trackColor={{ true: c.primary, false: c.borderStrong }}
          />
        </View>
        {radius.nearbyOnly && (
          <>
            <View style={[styles.rowBetween, styles.gapTop]}>
              <Text style={styles.label}>Show shops within</Text>
              <Text testID="radius-value" style={styles.value}>
                {formatKm(shownKm)}
              </Text>
            </View>
            <Slider
              testID="radius-slider"
              label="Search distance"
              value={radius.km}
              min={SEARCH_RADIUS_MIN_KM}
              max={SEARCH_RADIUS_MAX_KM}
              step={1}
              valueText={formatKm}
              onChange={setDraftKm}
              onChangeComplete={(km) => {
                setDraftKm(null);
                void radius.setKm(km);
              }}
            />
            <View style={styles.rowBetween}>
              <Text style={styles.hint}>{formatKm(SEARCH_RADIUS_MIN_KM)}</Text>
              <Text style={styles.hint}>{formatKm(SEARCH_RADIUS_MAX_KM)}</Text>
            </View>
          </>
        )}
      </View>

      <Text style={styles.section}>Routing preferences</Text>
      <View style={[styles.card, styles.rowBetween]}>
        <Text style={styles.label}>Avoid Tolls on Route</Text>
        <Switch
          testID="tolls-switch"
          value={avoidTolls}
          onValueChange={toggleTolls}
          trackColor={{ true: c.primary, false: c.borderStrong }}
        />
      </View>

      <Text style={styles.section}>Location</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          {manualLocation
            ? `Using ZIP code ${manualLocation.postalCode}`
            : deviceName
              ? `Using your device location · ${deviceName}`
              : "Using your device location"}
        </Text>
        <View style={styles.actions}>
          <Button
            variant="secondary"
            title="Set location by ZIP code"
            onPress={onOpenZip}
          />
          {manualLocation && (
            <Button
              variant="secondary"
              title="Use my device location"
              loading={locating}
              onPress={() => void switchToDevice()}
            />
          )}
        </View>
      </View>

      <Text style={styles.section}>Help</Text>
      <View style={styles.card}>
        <Button
          variant="secondary"
          title="Contact support"
          onPress={onOpenSupport}
        />
      </View>

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.card}>
        <SegmentedControl<ThemePreference>
          label="Theme"
          testID="theme-control"
          options={THEME_OPTIONS}
          value={theme.preference}
          onChange={(value) => void theme.setPreference(value)}
        />
        <Text style={[styles.hint, styles.gapTop]}>
          {theme.preference === "system"
            ? "Matches your phone's light or dark setting."
            : `Always ${THEME_LABELS[theme.preference].toLowerCase()}.`}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Sign out" variant="danger" onPress={() => void signOut()} />
        <Button
          title="Delete account"
          variant="danger"
          onPress={confirmDeleteAccount}
        />
      </View>
    </ScrollView>
  );
}

// A little longer than the drawer's slide-out animation (220 ms).
const SIGN_OUT_DELAY_MS = process.env.JEST_WORKER_ID ? 0 : 260;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 20, paddingBottom: 32 },
    section: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginTop: 18,
      marginBottom: 8,
    },
    card: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      padding: 14,
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: { color: c.text, fontSize: 16, fontWeight: "600" },
    value: { color: c.primaryText, fontSize: 16, fontWeight: "800" },
    hint: { color: c.textMuted, fontSize: 13 },
    flex: { flex: 1, paddingRight: 12 },
    gapTop: { marginTop: 14 },
    actions: { gap: 10, marginTop: 12 },
  });
