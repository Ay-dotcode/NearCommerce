import {
  getManualLocation,
  loadManualLocation,
  subscribeManualLocation,
} from "@/utils/location";
import { useEffect, useState } from "react";

// The ZIP code the shopper entered, if any, kept in step with the saved value.
export function useManualLocation() {
  const [manual, setManual] = useState(getManualLocation());

  useEffect(() => {
    const unsubscribe = subscribeManualLocation(() =>
      setManual(getManualLocation()),
    );
    loadManualLocation();
    return unsubscribe;
  }, []);

  return manual;
}
