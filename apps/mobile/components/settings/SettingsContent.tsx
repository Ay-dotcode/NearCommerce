import { apiErrorMessage } from "@/api/errors";
import VerifyEmailPrompt from "@/components/VerifyEmailPrompt";
import { Button, Slider, useDialogs } from "@/components/ui";
import {
  AVOID_TOLLS_KEY,
  SEARCH_RADIUS_MAX_MILES,
  SEARCH_RADIUS_MIN_MILES,
} from "@/constants";
import { useAuth } from "@/src/context/AuthContext";
import { useManualLocation } from "@/src/hooks/useManualLocation";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { clearManualLocation } from "@/utils/location";
import { apiClient } from "@nearcommerce/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

interface Props {
  onOpenZip: () => void;
  onOpenSupport: () => void;
}

const milesLabel = (miles: number) =>
  `${miles} ${miles === 1 ? "mile" : "miles"}`;

// Everything a shopper can configure, shown inside the left-hand settings drawer.
export default function SettingsContent({ onOpenZip, onOpenSupport }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { confirm } = useDialogs();
  const c = useColors();
  const { logout } = useAuth();
  const manualLocation = useManualLocation();
  const radius = useSearchRadius();
  const [draftMiles, setDraftMiles] = useState<number | null>(null);
  const [avoidTolls, setAvoidTolls] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AVOID_TOLLS_KEY).then((stored) => {
      if (stored !== null) setAvoidTolls(stored === "true");
    });
  }, []);

  const toggleTolls = async (value: boolean) => {
    setAvoidTolls(value);
    await AsyncStorage.setItem(AVOID_TOLLS_KEY, String(value));
  };

  const deleteAccount = async () => {
    try {
      await apiClient.delete("/users/me");
      await logout();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Couldn't delete account",
        text2: apiErrorMessage(error, "Please try again."),
      });
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

  const shownMiles = draftMiles ?? radius.miles;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <VerifyEmailPrompt />

      <Text style={styles.section}>Search distance</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Show shops within</Text>
          <Text testID="radius-value" style={styles.value}>
            {milesLabel(shownMiles)}
          </Text>
        </View>
        <Slider
          testID="radius-slider"
          label="Search distance"
          value={radius.miles}
          min={SEARCH_RADIUS_MIN_MILES}
          max={SEARCH_RADIUS_MAX_MILES}
          step={1}
          valueText={milesLabel}
          onChange={setDraftMiles}
          onChangeComplete={(miles) => {
            setDraftMiles(null);
            void radius.setMiles(miles);
          }}
        />
        <View style={styles.rowBetween}>
          <Text style={styles.hint}>{milesLabel(SEARCH_RADIUS_MIN_MILES)}</Text>
          <Text style={styles.hint}>{milesLabel(SEARCH_RADIUS_MAX_MILES)}</Text>
        </View>
        <Text style={styles.hint}>
          Home, search and categories only show stores this close to you.
        </Text>
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
              onPress={() => void clearManualLocation()}
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
      <View style={[styles.card, styles.rowBetween]}>
        <Text style={styles.label}>Theme</Text>
        <View style={styles.inline}>
          <Ionicons
            name="phone-portrait-outline"
            size={16}
            color={c.textMuted}
          />
          <Text style={styles.hint}>Matches your device</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Sign out"
          variant="danger"
          onPress={() => void logout()}
        />
        <Button
          title="Delete account"
          variant="danger"
          onPress={confirmDeleteAccount}
        />
      </View>
    </ScrollView>
  );
}

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
    inline: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { color: c.text, fontSize: 16, fontWeight: "600" },
    value: { color: c.primaryText, fontSize: 16, fontWeight: "800" },
    hint: { color: c.textMuted, fontSize: 13 },
    actions: { gap: 10, marginTop: 12 },
  });
