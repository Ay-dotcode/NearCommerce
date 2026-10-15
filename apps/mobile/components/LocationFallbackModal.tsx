import { BottomSheet } from "@/components/ui";
import { ZipForm } from "@/forms/ZipForm";
import { useZipForm } from "@/forms/useZipForm";

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
      <ZipForm
        formik={formik}
        dismissLabel={reason === "denied" ? "Not now" : "Cancel"}
        onDismiss={onClose}
      />
    </BottomSheet>
  );
}
