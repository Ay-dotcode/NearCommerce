import { BottomSheet } from "@/components/ui";
import { ZipForm } from "@/forms/ZipForm";
import { useZipForm } from "@/forms/useZipForm";
import { openAppSettings } from "@/helpers/appSettings";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  visible: boolean;
  // Called after a location was saved, or when the shopper chooses Not now.
  onClose: () => void;
  // Why the sheet is open, shown above the input.
  reason?: "denied" | "manual";
};

// Bottom sheet for choosing a location by ZIP code. The form itself lives in forms/.
export default function LocationFallbackModal({
  visible,
  onClose,
  reason = "denied",
}: Props) {
  const formik = useZipForm(visible, onClose);
  const styles = useThemedStyles(makeStyles);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dismissible={!formik.isSubmitting}
      testID="zip-sheet"
      title={
        reason === "denied" ? "Location is turned off" : "Set your location"
      }
      description={
        reason === "denied"
          ? "Enter your ZIP code and we'll show stores near it. You can allow location access any time in your phone's settings."
          : "Enter a ZIP code to see stores and prices near it."
      }
    >
      {/* Refusing location only turns off distance features: a ZIP code still works, and the
          shopper can switch location back on from the phone's settings whenever they like. */}
      {reason === "denied" && (
        <Pressable
          accessibilityRole="button"
          testID="open-app-settings"
          onPress={openAppSettings}
          style={styles.settingsLink}
        >
          <Text style={styles.settingsLinkText}>Open phone settings</Text>
        </Pressable>
      )}
      <ZipForm
        formik={formik}
        dismissLabel={reason === "denied" ? "Not now" : "Cancel"}
        onDismiss={onClose}
      />
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    settingsLink: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 4 },
    settingsLinkText: { color: c.primary, fontSize: 14, fontWeight: "700" },
  });
