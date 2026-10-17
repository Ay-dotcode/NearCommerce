import {
  getNearbyOnly,
  getSearchRadiusKm,
  kmToMeters,
  loadSearchRadius,
  setNearbyOnly,
  setSearchRadiusKm,
  subscribeSearchRadius,
} from "@/helpers/searchRadius";
import { useEffect, useSyncExternalStore } from "react";

// The shopper's "show shops within ... km" distance and the "only nearby" switch, kept in step
// across every screen. Pass `meters` and `nearbyOnly` straight to the search calls.
export function useSearchRadius() {
  const km = useSyncExternalStore(
    subscribeSearchRadius,
    getSearchRadiusKm,
    getSearchRadiusKm,
  );
  const nearbyOnly = useSyncExternalStore(
    subscribeSearchRadius,
    getNearbyOnly,
    getNearbyOnly,
  );
  useEffect(() => {
    void loadSearchRadius();
  }, []);
  return {
    km,
    meters: kmToMeters(km),
    setKm: setSearchRadiusKm,
    nearbyOnly,
    setNearbyOnly,
  };
}
