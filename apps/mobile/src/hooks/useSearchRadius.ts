import {
  getSearchRadiusMiles,
  loadSearchRadius,
  milesToMeters,
  setSearchRadiusMiles,
  subscribeSearchRadius,
} from "@/helpers/searchRadius";
import { useEffect, useSyncExternalStore } from "react";

// The shopper's "show shops within ..." distance, kept in step across every screen.
export function useSearchRadius() {
  const miles = useSyncExternalStore(
    subscribeSearchRadius,
    getSearchRadiusMiles,
    getSearchRadiusMiles,
  );
  useEffect(() => {
    void loadSearchRadius();
  }, []);
  return {
    miles,
    meters: milesToMeters(miles),
    setMiles: setSearchRadiusMiles,
  };
}
