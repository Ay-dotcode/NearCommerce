import type { Coords } from "@/utils/location";
import { getSessionLocation, subscribeManualLocation } from "@/utils/location";
import { useEffect, useState } from "react";

// Where nearby results are centred: a typed-in ZIP code, otherwise GPS.
// Null until the first lookup finishes, and updated if the shopper changes it.
export function useSessionCoords() {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      getSessionLocation().then((c) => {
        if (active) setCoords({ latitude: c.latitude, longitude: c.longitude });
      });
    load();
    const unsubscribe = subscribeManualLocation(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return coords;
}
