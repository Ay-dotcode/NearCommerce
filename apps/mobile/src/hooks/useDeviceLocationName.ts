import { lookupPlaceName, peekDeviceCoords } from "@/helpers/location";
import { useEffect, useState } from "react";

// The name of the place the phone is at ("Nicosia, Cyprus"), or null while unknown. Only looks
// it up when `enabled` (i.e. when the device location, not a ZIP code, is in use).
export function useDeviceLocationName(enabled: boolean, refreshKey?: unknown) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      setName(null);
      return;
    }
    let active = true;
    (async () => {
      const coords = await peekDeviceCoords();
      if (!coords) return;
      const place = await lookupPlaceName(coords);
      if (active) setName(place);
    })();
    return () => {
      active = false;
    };
  }, [enabled, refreshKey]);
  return name;
}
