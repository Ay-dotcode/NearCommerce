import type { ManualLocation } from "@/utils/location";
import {
  getManualLocation,
  loadManualLocation,
  subscribeManualLocation,
} from "@/utils/location";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

// A typed-in ZIP code has no GPS metadata, so fill the rest with nulls.
const toLocationObject = (m: ManualLocation): Location.LocationObject => ({
  coords: {
    latitude: m.latitude,
    longitude: m.longitude,
    altitude: null,
    accuracy: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

// Polls GPS once per mount. A ZIP code the shopper entered wins over GPS, and is
// the only way in when location permission is denied.
export function useLocationFetcher() {
  const [gps, setGps] = useState<Location.LocationObject | null>(null);
  const [manual, setManual] = useState<ManualLocation | null>(
    getManualLocation(),
  );
  const [isFetching, setIsFetching] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(
    () => subscribeManualLocation(() => setManual(getManualLocation())),
    [],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setIsFetching(true);
      await loadManualLocation();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (status !== "granted") {
        setPermissionDenied(true);
        setErrorMsg("Permission to access location was denied");
        setIsFetching(false);
        return;
      }

      try {
        const fetched = await Location.getCurrentPositionAsync({});
        if (active) setGps(fetched);
      } catch {
        if (active) setErrorMsg("Couldn't read your location");
      } finally {
        if (active) setIsFetching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const location = manual ? toLocationObject(manual) : gps;
  return {
    location,
    isFetching: isFetching && !manual,
    errorMsg,
    permissionDenied,
    source: manual ? ("manual" as const) : ("gps" as const),
    manualLocation: manual,
  };
}
